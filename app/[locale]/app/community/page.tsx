import { ShieldCheck, MessageCircle } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ProGate } from '@/components/app/ProGate';
import { getUserPlan } from '@/lib/plan';

function timeAgo(iso: string, locale: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (mins < 60) return rtf.format(-mins, 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.floor(hours / 24), 'day');
}

export default async function CommunityPage() {
  const t = await getTranslations('app.community');
  const plan = await getUserPlan();
  if (plan !== 'pro') return <ProGate feature={t('eyebrow')} />;
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from('forum_posts')
    .select('id, category, body, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">{t('eyebrow')}</div>
      <h1 className="font-display text-lg font-extrabold mb-4">{t('title')}</h1>

      <div className="flex items-center gap-2.5 bg-success/[0.08] border border-success/25 rounded-2xl px-3.5 py-3 mb-4 text-xs text-text2">
        <ShieldCheck size={16} color="var(--success)" strokeWidth={2} />
        {t('moderated')}
      </div>

      <div className="flex items-center gap-2.5 bg-surface border border-border rounded-2xl px-3.5 py-3 mb-4 text-sm text-text2">
        <div className="w-7 h-7 rounded-full bg-accent-btn flex-shrink-0" />
        {t('compose')}
      </div>

      {posts && posts.length > 0 ? (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <div key={p.id} className="bg-surface border border-border rounded-2xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-accent-soft text-accent2 flex items-center justify-center text-[11px] font-bold flex-shrink-0">A</div>
                <div>
                  <div className="text-xs font-bold">ARMY</div>
                  <div className="text-[11px] text-text2">{timeAgo(p.created_at, locale)}</div>
                </div>
                <div className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent2">{p.category}</div>
              </div>
              <p className="text-[13px] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center gap-3 py-14 px-4">
          <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center">
            <MessageCircle size={24} color="var(--accent2)" strokeWidth={1.8} />
          </div>
          <div className="text-sm font-bold">{t('emptyTitle')}</div>
          <p className="text-[13px] text-text2 max-w-[26ch]">{t('emptyBody')}</p>
        </div>
      )}
    </div>
  );
}
