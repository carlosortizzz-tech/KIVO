import { ShieldCheck, MessageCircle, Camera } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ProGate } from '@/components/app/ProGate';
import { getUserPlan } from '@/lib/plan';
import { CommunityTabs } from '@/components/app/CommunityTabs';
import { ExperienceComposer } from '@/components/app/ExperienceComposer';
import { ExperienceCard, type ExperienceCardData } from '@/components/app/ExperienceCard';
import { ComposePost, categoryKey, CATEGORIES } from '@/components/app/ComposePost';

function timeAgo(iso: string, locale: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (mins < 60) return rtf.format(-mins, 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.floor(hours / 24), 'day');
}

async function buildExperiencesFeed(): Promise<ExperienceCardData[]> {
  const t = await getTranslations('app.community');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from('concert_experiences')
    .select('id, user_id, photo_url, caption, original_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  if (!rows || rows.length === 0) return [];

  const originalIds = [...new Set(rows.filter((r) => r.original_id).map((r) => r.original_id as string))];
  const { data: originals } = originalIds.length
    ? await supabase.from('concert_experiences').select('id, user_id, photo_url, caption, created_at').in('id', originalIds)
    : { data: [] as { id: string; user_id: string; photo_url: string; caption: string | null; created_at: string }[] };
  const originalsById = new Map((originals ?? []).map((o) => [o.id, o]));

  const allUserIds = [
    ...new Set([...rows.map((r) => r.user_id), ...(originals ?? []).map((o) => o.user_id)]),
  ];
  const { data: profiles } = allUserIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', allUserIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? t('anonymousFan')]));

  // Ids de contenido "raíz" que se van a mostrar (el original detrás de cada fila, sea repost o no)
  const rootIds = [...new Set(rows.map((r) => r.original_id ?? r.id))];
  const { data: replies } = rootIds.length
    ? await supabase
        .from('concert_experience_replies')
        .select('id, experience_id, user_id, body, created_at')
        .in('experience_id', rootIds)
        .order('created_at', { ascending: true })
    : { data: [] as { id: string; experience_id: string; user_id: string; body: string; created_at: string }[] };
  const repliesByRoot = new Map<string, ExperienceCardData['replies']>();
  for (const r of replies ?? []) {
    const list = repliesByRoot.get(r.experience_id) ?? [];
    list.push({ id: r.id, body: r.body, authorName: nameById.get(r.user_id) ?? t('anonymousFan'), createdAt: r.created_at });
    repliesByRoot.set(r.experience_id, list);
  }

  // Ids que el usuario actual ya reposteó (para no dejarlo repostear dos veces)
  const myRepostedRootIds = new Set(
    user ? rows.filter((r) => r.user_id === user.id && r.original_id).map((r) => r.original_id as string) : []
  );

  // Moderación (47-LEGAL-FISCAL-Y-PRIVACIDAD): un usuario que bloqueó a otro no debe ver más su
  // contenido — se filtra acá, en el servidor, antes de armar el feed.
  const { data: blocks } = user
    ? await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id)
    : { data: [] as { blocked_id: string }[] };
  const blockedIds = new Set((blocks ?? []).map((b) => b.blocked_id));

  return rows
    .map((row): ExperienceCardData | null => {
      const isRepost = !!row.original_id;
      const root = isRepost ? originalsById.get(row.original_id as string) : row;
      if (!root || !root.photo_url) return null; // dato inconsistente, se omite en vez de romper la pantalla
      if (blockedIds.has(root.user_id) || blockedIds.has(row.user_id)) return null;
      return {
        key: row.id,
        repostTargetId: root.id,
        authorUserId: root.user_id,
        photoUrl: root.photo_url,
        caption: root.caption,
        authorName: nameById.get(root.user_id) ?? t('anonymousFan'),
        createdAt: root.created_at,
        repostedByName: isRepost ? nameById.get(row.user_id) ?? t('experiences.someone') : null,
        replies: repliesByRoot.get(root.id) ?? [],
        alreadyReposted: myRepostedRootIds.has(root.id),
        isOwnOriginal: user?.id === root.user_id,
      };
    })
    .filter((x): x is ExperienceCardData => x !== null);
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

  const postAuthorIds = [...new Set((posts ?? []).map((p) => p.user_id))];
  const { data: postAuthors } = postAuthorIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', postAuthorIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const postAuthorNameById = new Map((postAuthors ?? []).map((a) => [a.id, a.display_name ?? t('anonymousFan')]));

  const experiences = await buildExperiencesFeed();

  const feed = (
    <>
      <div className="flex items-center gap-2.5 bg-success/[0.08] border border-success/25 rounded-2xl px-3.5 py-3 mb-4 text-xs text-text2">
        <ShieldCheck size={16} color="var(--success)" strokeWidth={2} />
        {t('moderated')}
      </div>

      <ComposePost />

      {posts && posts.length > 0 ? (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <div key={p.id} className="bg-surface border border-border rounded-2xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-accent-soft text-accent2 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  {(postAuthorNameById.get(p.user_id) ?? '?')[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold">{postAuthorNameById.get(p.user_id) ?? t('anonymousFan')}</div>
                  <div className="text-[11px] text-text2">{timeAgo(p.created_at, locale)}</div>
                </div>
                <div className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent2">
                  {(CATEGORIES as readonly string[]).includes(p.category) ? t(categoryKey[p.category as (typeof CATEGORIES)[number]]) : p.category}
                </div>
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
    </>
  );

  const experiencesTab = (
    <>
      <ExperienceComposer />
      {experiences.length > 0 ? (
        <div className="flex flex-col gap-3">
          {experiences.map((exp) => (
            <ExperienceCard key={exp.key} data={exp} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center gap-3 py-14 px-4">
          <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center">
            <Camera size={24} color="var(--accent2)" strokeWidth={1.8} />
          </div>
          <div className="text-sm font-bold">{t('experiences.emptyTitle')}</div>
          <p className="text-[13px] text-text2 max-w-[26ch]">{t('experiences.emptyBody')}</p>
        </div>
      )}
    </>
  );

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">{t('eyebrow')}</div>
      <h1 className="font-display text-lg font-extrabold mb-4">{t('title')}</h1>
      <CommunityTabs feed={feed} experiences={experiencesTab} />
    </div>
  );
}
