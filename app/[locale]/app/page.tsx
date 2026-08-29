import { MapPin, Snowflake, CalendarDays, Bell } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Countdown } from '@/components/app/Countdown';
import { AddToCalendar } from '@/components/app/AddToCalendar';
import { WeekStrip } from '@/components/app/WeekStrip';
import { BadgeUnlockedModal } from '@/components/app/BadgeUnlockedModal';
import { StreakFrozenBanner } from '@/components/app/StreakFrozenBanner';
import { CollapsibleSection } from '@/components/app/CollapsibleSection';
import { Link } from '@/i18n/navigation';

async function formatRelative(iso: string, locale: string, t: Awaited<ReturnType<typeof getTranslations<'app'>>>) {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days <= 0) return t('radar.relativeToday');
  if (days === 1) return t('radar.relativeTomorrow');
  return t('radar.relativeDays', { days });
}

// Contenido editorial (39-INTERNACIONALIZACION): columnas por idioma en la tabla, con reserva
// automática al español si falta la traducción de esa fila — nunca texto vacío.
function pickLocale(locale: string, es: string, en: string | null, fr: string | null, ko: string | null): string {
  const byLocale = locale === 'en' ? en : locale === 'fr' ? fr : locale === 'ko' ? ko : null;
  return byLocale ?? es;
}

const typeKeys: Record<string, string> = {
  preventa: 'typePreventa',
  comeback: 'typeComeback',
  membresia: 'typeMembresia',
  live: 'typeLive',
  cumpleanos: 'typeCumpleanos',
  votacion: 'typeVotacion',
  concierto: 'typeConcierto',
};

export default async function RadarPage() {
  const locale = await getLocale();
  const t = await getTranslations('app');
  const supabase = await createClient();
  const { data: eventRows } = await supabase
    .from('events')
    .select('id, title, title_en, title_fr, title_ko, type, platform, starts_at, ends_at, description, description_en, description_fr, description_ko, url, venue')
    .order('starts_at', { ascending: true })
    .limit(10);
  const events = (eventRows ?? []).map((ev) => ({
    ...ev,
    title: pickLocale(locale, ev.title, ev.title_en, ev.title_fr, ev.title_ko),
    description: ev.description ? pickLocale(locale, ev.description, ev.description_en, ev.description_fr, ev.description_ko) : ev.description,
  }));

  // La tarjeta de "próximo concierto" solo aparece dentro de la ventana de 20 días antes —
  // conciertos lejanos (meses) no se destacan aquí para no volver irrelevante el countdown.
  const CONCERT_WINDOW_DAYS = 20;
  const concertWindowEnd = new Date(Date.now() + CONCERT_WINDOW_DAYS * 86400000).toISOString();
  const { data: nextConcertRow } = await supabase
    .from('events')
    .select('id, title, title_en, title_fr, title_ko, starts_at, ends_at, description, description_en, description_fr, description_ko, url, venue')
    .eq('type', 'concierto')
    .gte('starts_at', new Date().toISOString())
    .lte('starts_at', concertWindowEnd)
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const nextConcert = nextConcertRow && {
    ...nextConcertRow,
    title: pickLocale(locale, nextConcertRow.title, nextConcertRow.title_en, nextConcertRow.title_fr, nextConcertRow.title_ko),
    description: nextConcertRow.description ? pickLocale(locale, nextConcertRow.description, nextConcertRow.description_en, nextConcertRow.description_fr, nextConcertRow.description_ko) : nextConcertRow.description,
  };

  // Cuando la misma ciudad tiene varias fechas seguidas, se consolidan en UNA tarjeta (la más
  // próxima) — las demás se muestran como "fechas adicionales" acá y siguen apareciendo tal
  // cual en la lista de abajo, por si el usuario quiere agregar cada una a su calendario.
  const { data: sameVenueDates } = nextConcert?.venue
    ? await supabase
        .from('events')
        .select('id, starts_at')
        .eq('type', 'concierto')
        .eq('venue', nextConcert.venue)
        .neq('id', nextConcert.id)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
    : { data: [] };

  // Racha real de días consecutivos usando la app — se cuenta al abrir Radar (home de la app).
  // La función vive en la base de datos (bump_streak) para que el conteo sea atómico y no se
  // pueda manipular desde el cliente. También otorga los badges de racha (7/30 días) de forma
  // atómica y devuelve cuál se acaba de desbloquear, para celebrarlo EN esta misma visita
  // (24-GAMIFICACION: un hito celebrado al día siguiente no celebra nada).
  const { data: streakResult } = await supabase.rpc('bump_streak');
  const streak: number = streakResult?.streak ?? 1;
  const freezes: number = streakResult?.freezes ?? 0;
  const freezesConsumed: number = streakResult?.freezesConsumed ?? 0;
  const newBadgeCode: string | null = streakResult?.newBadge ?? null;
  const { data: newBadge } = newBadgeCode
    ? await supabase.from('badges').select('name, description, icon').eq('code', newBadgeCode).maybeSingle()
    : { data: null };

  // El "próximo evento" genérico ignora conciertos — esos ya tienen su propia tarjeta arriba.
  const nextEvent = events?.find((ev) => ev.type !== 'concierto');
  // Solo las 3 próximas en la lista de abajo — el resto se navega desde la tira de semana.
  const restEvents = (events?.filter((ev) => ev.id !== nextEvent?.id) ?? []).slice(0, 3);

  // Todas las fechas de concierto (sin límite de ventana) para marcar la estrella al navegar
  // semanas hacia adelante o atrás en la tira de días. Se manda el ISO completo — el día
  // calendario se calcula en el navegador (hora LOCAL del usuario), no en el servidor, para
  // que coincida con los números que ya se muestran en la tira (también en hora local).
  const { data: allConcertRows } = await supabase.from('events').select('starts_at, venue').eq('type', 'concierto');
  const concertDates = (allConcertRows ?? []).map((r) => ({ startsAt: r.starts_at, venue: r.venue }));

  const relatives = await Promise.all(restEvents.map((ev) => formatRelative(ev.starts_at, locale, t)));

  // Indicador de trial (02C): "Día X de 7", discreto y SIN color de alarma — nunca un countdown
  // rojo de presión. Solo se muestra mientras status='trialing'.
  const { data: { user } } = await supabase.auth.getUser();
  let trialDay: number | null = null;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('status, trial_ends_at').eq('id', user.id).maybeSingle();
    if (profile?.status === 'trialing' && profile.trial_ends_at) {
      const daysLeft = Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000);
      trialDay = Math.min(7, Math.max(1, 7 - Math.max(0, daysLeft - 1)));
    }
  }

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">{t('radar.greeting')}</div>
      <h1 className="font-display text-lg font-extrabold mb-4">{t('radar.title')}</h1>

      {trialDay !== null && (
        <Link href="/app/cuenta" className="flex items-center gap-2 bg-sunken rounded-full px-3.5 py-2 mb-4 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-accent2" />
          <span className="text-xs font-semibold text-text2">{t('radar.trialDay', { day: trialDay })}</span>
        </Link>
      )}

      {nextConcert && (
        <div className="feature-card rounded-2xl p-4 mb-4" style={{ boxShadow: 'var(--glow)' }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2">{t('radar.nextConcert')}</div>
            <AddToCalendar event={{
              id: nextConcert.id,
              title: nextConcert.title,
              startsAt: nextConcert.starts_at,
              endsAt: nextConcert.ends_at,
              description: nextConcert.description,
              url: nextConcert.url,
            }} />
          </div>
          <div className="text-lg font-bold mb-1">{nextConcert.title}</div>
          {nextConcert.venue && (
            <div className="flex items-center gap-1.5 text-xs text-text2 mb-1">
              <MapPin size={14} strokeWidth={2} />
              {nextConcert.venue}
            </div>
          )}
          {sameVenueDates && sameVenueDates.length > 0 && (
            <div className="text-[11px] text-text2 mb-3">
              {t('radar.additionalDates', {
                dates: sameVenueDates
                  .map((d) => new Date(d.starts_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }))
                  .join(' · '),
              })}
            </div>
          )}
          <Countdown target={nextConcert.starts_at} />
        </div>
      )}

      {nextEvent && (
        <div className="mb-4">
          <CollapsibleSection
            title={nextEvent.title}
            icon={<Bell size={16} strokeWidth={2} />}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="text-xs font-bold uppercase tracking-wide text-accent2">
                {t('radar.upcoming', { type: t(`radar.${typeKeys[nextEvent.type] ?? 'typePreventa'}` as never) })}
              </div>
              <AddToCalendar event={{
                id: nextEvent.id,
                title: nextEvent.title,
                startsAt: nextEvent.starts_at,
                endsAt: nextEvent.ends_at,
                description: nextEvent.description,
                url: nextEvent.url,
              }} />
            </div>
            <Countdown target={nextEvent.starts_at} />
            {nextEvent.description && (
              <p className="text-[13px] text-text2 leading-relaxed mt-3 mb-3">{nextEvent.description}</p>
            )}
            <Link
              href={{ pathname: '/app/guide', query: { platform: nextEvent.platform } }}
              className="block text-center bg-accent-btn text-white font-bold text-[13px] rounded-xl py-2.5 w-full mt-3"
              style={{ boxShadow: 'var(--glow)' }}
            >
              {t('radar.viewGuide')}
            </Link>
          </CollapsibleSection>
        </div>
      )}

      <WeekStrip locale={locale} concertDates={concertDates} />

      {restEvents.length === 0 && !nextEvent && (
        <div className="text-center py-10 text-sm text-text2">{t('radar.noEvents')}</div>
      )}
      {restEvents.length > 0 && (
        <CollapsibleSection title={t('radar.upcomingEventsTitle')} icon={<CalendarDays size={16} strokeWidth={2} />} count={restEvents.length} defaultOpen>
          <div className="flex flex-col gap-2.5">
            {restEvents.map((ev, i) => (
              <div key={ev.id} className="flex gap-3 items-start bg-sunken rounded-xl p-3.5">
                <div className="icon-chip-accent w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-extrabold text-center leading-tight">
                  {new Date(ev.starts_at).toLocaleDateString(locale, { weekday: 'short' }).toUpperCase().slice(0, 3)}
                  <br />{new Date(ev.starts_at).getDate()}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-bold mb-0.5">{ev.title}</div>
                  <div className="text-xs text-text2">{t(`radar.${typeKeys[ev.type] ?? 'typePreventa'}` as never)}{ev.platform ? ` · ${ev.platform}` : ''}</div>
                </div>
                <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success whitespace-nowrap">
                  {relatives[i]}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <div className="flex items-center gap-3 bg-surface border border-border rounded-2xl p-3.5 mt-4">
        <div className="font-display text-xl font-extrabold text-accent2">{streak}</div>
        <div className="text-xs text-text2 flex-1"><b className="text-text block">{t('radar.streakLabel')}</b>{t('radar.streakSub')}</div>
        {freezes > 0 && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-accent2 bg-accent2/10 rounded-full px-2.5 py-1 whitespace-nowrap">
            <Snowflake size={12} strokeWidth={2.5} />
            {freezes}
          </div>
        )}
      </div>

      {newBadge && <BadgeUnlockedModal name={newBadge.name} description={newBadge.description} icon={newBadge.icon} />}
      {!newBadge && freezesConsumed > 0 && <StreakFrozenBanner streak={streak} freezesLeft={freezes} />}
    </div>
  );
}
