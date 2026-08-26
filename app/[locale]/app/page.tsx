import { MapPin } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Countdown } from '@/components/app/Countdown';
import { AddToCalendar } from '@/components/app/AddToCalendar';

async function formatRelative(iso: string, locale: string, t: Awaited<ReturnType<typeof getTranslations<'app'>>>) {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days <= 0) return t('radar.relativeToday');
  if (days === 1) return t('radar.relativeTomorrow');
  return t('radar.relativeDays', { days });
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
  const { data: events } = await supabase
    .from('events')
    .select('id, title, type, platform, starts_at, ends_at, description, url, venue')
    .order('starts_at', { ascending: true })
    .limit(10);

  const { data: nextConcert } = await supabase
    .from('events')
    .select('id, title, starts_at, ends_at, description, url, venue')
    .eq('type', 'concierto')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const nextEvent = events?.[0];
  const restEvents = events?.slice(1) ?? [];

  const today = new Date();
  const isoDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - isoDayOfWeek + 1 + i);
    return d;
  });

  const relatives = await Promise.all(restEvents.map((ev) => formatRelative(ev.starts_at, locale, t)));

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">{t('radar.greeting')}</div>
      <h1 className="font-display text-lg font-extrabold mb-4">{t('radar.title')}</h1>

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
            <div className="flex items-center gap-1.5 text-xs text-text2 mb-3">
              <MapPin size={14} strokeWidth={2} />
              {nextConcert.venue}
            </div>
          )}
          <Countdown target={nextConcert.starts_at} />
        </div>
      )}

      {nextEvent && (
        <div className="feature-card rounded-2xl p-4 mb-4">
          <div className="flex items-start justify-between gap-2 mb-2">
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
          <div className="text-lg font-bold mb-3">{nextEvent.title}</div>
          <Countdown target={nextEvent.starts_at} />
          <button className="bg-accent-btn text-white font-bold text-[13px] rounded-xl py-2.5 w-full" style={{ boxShadow: 'var(--glow)' }}>
            {t('radar.viewGuide')}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-semibold">
          {weekDays[0].toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
          {' – '}
          {weekDays[6].toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
      <div className="flex gap-1.5 mb-4">
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          const dayName = d.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2);
          return (
            <div key={i} className={`flex-1 text-center rounded-[10px] py-2 border ${isToday ? 'bg-accent-btn border-accent-btn' : 'bg-surface border-border'}`} style={isToday ? { boxShadow: 'var(--glow)' } : undefined}>
              <div className={`text-[9px] ${isToday ? 'text-white/80' : 'text-text2'}`}>{dayName}</div>
              <div className="font-display text-[13px] font-bold mt-0.5">{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5">
        {restEvents.length === 0 && !nextEvent && (
          <div className="text-center py-10 text-sm text-text2">{t('radar.noEvents')}</div>
        )}
        {restEvents.map((ev, i) => (
          <div key={ev.id} className="flex gap-3 items-start bg-surface border border-border rounded-2xl p-3.5">
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

      <div className="flex items-center gap-3 bg-surface border border-border rounded-2xl p-3.5 mt-4">
        <div className="font-display text-xl font-extrabold text-accent2">12</div>
        <div className="text-xs text-text2"><b className="text-text block">{t('radar.streakLabel')}</b>{t('radar.streakSub')}</div>
      </div>
    </div>
  );
}
