import { Newspaper, ExternalLink, CalendarClock } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Reveal } from '@/components/app/Reveal';
import { LocalEventTime } from '@/components/app/LocalEventTime';
import { CollapsibleSection } from '@/components/app/CollapsibleSection';

// Hallazgo real del usuario (2026-09-11): al cambiar el idioma de la app, el nav y los títulos
// cambiaban pero el CONTENIDO de las noticias se quedaba en español — news_items nunca tuvo
// columnas por idioma. Mismo patrón que pickLocale() en Radar: reserva automática al español si
// falta la traducción de esa fila (contenido cargado antes de este fix, o si el cron falló).
function pickLocale(locale: string, es: string, en: string | null, fr: string | null, ko: string | null): string {
  const byLocale = locale === 'en' ? en : locale === 'fr' ? fr : locale === 'ko' ? ko : null;
  return byLocale ?? es;
}

export async function KivoNews() {
  const t = await getTranslations('app.guide');
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: newsRows } = await supabase
    .from('news_items')
    .select('id, headline, headline_en, headline_fr, headline_ko, summary, summary_en, summary_fr, summary_ko, source_url, source_name')
    .eq('kind', 'news')
    .order('created_at', { ascending: false })
    .limit(5);
  const news = (newsRows ?? []).map((n) => ({
    ...n,
    headline: pickLocale(locale, n.headline, n.headline_en, n.headline_fr, n.headline_ko),
    summary: pickLocale(locale, n.summary, n.summary_en, n.summary_fr, n.summary_ko),
  }));

  // Solo eventos que todavía no pasaron (o sin hora exacta, pero recientes) — sin esto, el
  // calendario iría acumulando anuncios viejos para siempre.
  const { data: scheduleRows } = await supabase
    .from('news_items')
    .select('id, headline, headline_en, headline_fr, headline_ko, summary, summary_en, summary_fr, summary_ko, source_url, source_name, event_at')
    .eq('kind', 'schedule')
    .or(`event_at.gte.${new Date().toISOString()},event_at.is.null`)
    .order('event_at', { ascending: true, nullsFirst: false })
    .limit(8);
  const schedule = (scheduleRows ?? []).map((s) => ({
    ...s,
    headline: pickLocale(locale, s.headline, s.headline_en, s.headline_fr, s.headline_ko),
    summary: pickLocale(locale, s.summary, s.summary_en, s.summary_fr, s.summary_ko),
  }));

  const hasNews = news && news.length > 0;
  const hasSchedule = schedule && schedule.length > 0;
  if (!hasNews && !hasSchedule) return null; // sin nada generado todavía — no mostrar secciones vacías

  return (
    <Reveal>
      {hasNews && (
        <CollapsibleSection title={t('newsTitle')} icon={<Newspaper size={16} strokeWidth={2} />} count={news!.length}>
          <div className="flex flex-col gap-2.5">
            {news!.map((n) => (
              <a
                key={n.id}
                href={n.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-sunken rounded-xl p-3.5 transition-transform duration-150 active:scale-[0.98]"
              >
                <div className="text-sm font-bold mb-1">{n.headline}</div>
                <p className="text-[13px] text-text2 leading-relaxed mb-2">{n.summary}</p>
                <div className="flex items-center gap-1 text-[11px] text-accent2 font-semibold">
                  {t('newsSource', { name: n.source_name })}
                  <ExternalLink size={11} strokeWidth={2} />
                </div>
              </a>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {hasSchedule && (
        <CollapsibleSection title={t('scheduleTitle')} icon={<CalendarClock size={16} strokeWidth={2} />} count={schedule!.length}>
          <div className="flex flex-col gap-2.5">
            {schedule!.map((s) => (
              <a
                key={s.id}
                href={s.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-sunken rounded-xl p-3.5 transition-transform duration-150 active:scale-[0.98]"
              >
                {s.event_at && (
                  <div className="text-[11px] font-bold text-accent2 mb-1 uppercase tracking-wide">
                    <LocalEventTime iso={s.event_at} />
                  </div>
                )}
                <div className="text-sm font-bold mb-1">{s.headline}</div>
                <p className="text-[13px] text-text2 leading-relaxed mb-2">{s.summary}</p>
                <div className="flex items-center gap-1 text-[11px] text-accent2 font-semibold">
                  {t('newsSource', { name: s.source_name })}
                  <ExternalLink size={11} strokeWidth={2} />
                </div>
              </a>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </Reveal>
  );
}
