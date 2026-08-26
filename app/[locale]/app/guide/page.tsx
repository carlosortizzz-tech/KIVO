import { Search, Rss, ShieldQuestion, Ticket, BookOpenText } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Reveal } from '@/components/app/Reveal';
import { ProGate } from '@/components/app/ProGate';
import { getUserPlan } from '@/lib/plan';
import { YoutubeVideos } from '@/components/app/YoutubeVideos';
import { SpotifyTracks } from '@/components/app/SpotifyTracks';

const iconMap: Record<string, typeof Rss> = {
  Weverse: BookOpenText,
  Bubble: ShieldQuestion,
  'Weverse Live': Rss,
  Ticketing: Ticket,
};

export default async function GuidePage() {
  const t = await getTranslations('app.guide');
  const plan = await getUserPlan();
  if (plan !== 'pro') return <ProGate feature={t('eyebrow')} />;
  const supabase = await createClient();
  const { data: guides, error } = await supabase
    .from('guides')
    .select('id, title, category, platform, read_minutes')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('No se pudieron cargar las guías de KIVO');
  }

  return (
    <div>
      <Reveal>
        <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">{t('eyebrow')}</div>
        <h1 className="font-display text-lg font-extrabold mb-4">{t('title')}</h1>

        <div className="flex items-center gap-2 bg-surface border border-border rounded-2xl px-3.5 py-3 mb-4 text-sm text-text2">
          <Search size={16} strokeWidth={2} />
          {t('search')}
        </div>
      </Reveal>

      <div className="flex flex-col gap-2.5">
        {(guides ?? []).map((g, i) => {
          const Icon = iconMap[g.platform] ?? BookOpenText;
          return (
            <Reveal key={g.id} delayMs={80 + i * 60}>
              <button className="icon-chip-accent-row flex items-center gap-3 bg-surface border border-border rounded-2xl p-3.5 w-full text-left transition-transform duration-150 active:scale-[0.98]">
                <div className="icon-chip-accent firma-icon w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{g.title}</div>
                  <div className="text-xs text-text2 mt-0.5">{g.category}</div>
                </div>
                <div className="text-[11px] text-text2 whitespace-nowrap">{t('minutes', { count: g.read_minutes })}</div>
              </button>
            </Reveal>
          );
        })}
        {(!guides || guides.length === 0) && (
          <div className="flex flex-col items-center text-center gap-2 py-10">
            <div className="text-sm text-text2">{t('empty')}</div>
          </div>
        )}
      </div>
      <YoutubeVideos />
      <SpotifyTracks />
    </div>
  );
}
