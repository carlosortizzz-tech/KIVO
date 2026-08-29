import { Newspaper, ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Reveal } from '@/components/app/Reveal';

export async function KivoNews() {
  const t = await getTranslations('app.guide');
  const supabase = await createClient();
  const { data: news } = await supabase
    .from('news_items')
    .select('id, headline, summary, source_url, source_name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!news || news.length === 0) return null; // sin noticias generadas todavía — no mostrar la sección vacía

  return (
    <Reveal>
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent2 mb-2">
        <Newspaper size={13} strokeWidth={2} />
        {t('newsTitle')}
      </div>
      <div className="flex flex-col gap-2.5 mb-6">
        {news.map((n) => (
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
    </Reveal>
  );
}
