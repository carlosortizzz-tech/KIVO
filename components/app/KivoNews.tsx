import { Newspaper, ExternalLink, CalendarClock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Reveal } from '@/components/app/Reveal';
import { LocalEventTime } from '@/components/app/LocalEventTime';

export async function KivoNews() {
  const t = await getTranslations('app.guide');
  const supabase = await createClient();

  const { data: news } = await supabase
    .from('news_items')
    .select('id, headline, summary, source_url, source_name')
    .eq('kind', 'news')
    .order('created_at', { ascending: false })
    .limit(5);

  // Solo eventos que todavía no pasaron (o sin hora exacta, pero recientes) — sin esto, el
  // calendario iría acumulando anuncios viejos para siempre.
  const { data: schedule } = await supabase
    .from('news_items')
    .select('id, headline, summary, source_url, source_name, event_at')
    .eq('kind', 'schedule')
    .or(`event_at.gte.${new Date().toISOString()},event_at.is.null`)
    .order('event_at', { ascending: true, nullsFirst: false })
    .limit(8);

  const hasNews = news && news.length > 0;
  const hasSchedule = schedule && schedule.length > 0;
  if (!hasNews && !hasSchedule) return null; // sin nada generado todavía — no mostrar secciones vacías

  return (
    <Reveal>
      {hasNews && (
        <>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent2 mb-2">
            <Newspaper size={13} strokeWidth={2} />
            {t('newsTitle')}
          </div>
          <div className="flex flex-col gap-2.5 mb-6">
            {news!.map((n) => (
              <a
                key={n.id}
                href={n.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-surface border border-border rounded-2xl p-3.5 transition-transform duration-150 active:scale-[0.98]"
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
        </>
      )}

      {hasSchedule && (
        <>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent2 mb-2">
            <CalendarClock size={13} strokeWidth={2} />
            {t('scheduleTitle')}
          </div>
          <div className="flex flex-col gap-2.5 mb-6">
            {schedule!.map((s) => (
              <a
                key={s.id}
                href={s.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-surface border border-border rounded-2xl p-3.5 transition-transform duration-150 active:scale-[0.98]"
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
        </>
      )}
    </Reveal>
  );
}
