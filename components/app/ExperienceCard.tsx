'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Repeat2, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

export type ExperienceReply = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export type ExperienceCardData = {
  key: string; // id de la fila (original o repost) — solo para la key de React
  repostTargetId: string; // id de la publicación ORIGINAL — a esto apuntan repost/reply siempre
  photoUrl: string;
  caption: string | null;
  authorName: string;
  createdAt: string;
  repostedByName: string | null; // si esta fila es un repost, el nombre de quien repostea
  replies: ExperienceReply[];
  alreadyReposted: boolean;
  isOwnOriginal: boolean; // el usuario actual es el autor del contenido original
};

export function ExperienceCard({ data }: { data: ExperienceCardData }) {
  const t = useTranslations('app.community.experiences');
  const router = useRouter();
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [reposted, setReposted] = useState(data.alreadyReposted);
  const [busy, setBusy] = useState(false);

  async function handleRepost() {
    if (reposted || busy || data.isOwnOriginal) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { error } = await supabase.from('concert_experiences').insert({
      user_id: user.id,
      original_id: data.repostTargetId,
    });
    setBusy(false);
    if (!error) {
      setReposted(true);
      router.refresh();
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || busy) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { error } = await supabase.from('concert_experience_replies').insert({
      experience_id: data.repostTargetId,
      user_id: user.id,
      body: replyText.trim(),
    });
    setBusy(false);
    if (!error) {
      setReplyText('');
      router.refresh();
    }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {data.repostedByName && (
        <div className="flex items-center gap-1.5 px-3.5 pt-3 text-[11px] text-text2">
          <Repeat2 size={12} strokeWidth={2} />
          {t('repostedBy', { name: data.repostedByName })}
        </div>
      )}
      <div className="flex items-center gap-2 p-3.5 pb-2">
        <div className="w-7 h-7 rounded-full bg-accent-soft text-accent2 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
          {data.authorName[0]?.toUpperCase() ?? 'A'}
        </div>
        <div className="text-xs font-bold">{data.authorName}</div>
      </div>
      <div className="relative w-full aspect-[4/3]">
        <Image src={data.photoUrl} alt={data.caption ?? ''} fill className="object-cover" sizes="480px" />
      </div>
      {data.caption && <p className="text-[13px] leading-relaxed px-3.5 pt-3">{data.caption}</p>}

      <div className="flex items-center gap-4 px-3.5 py-3">
        <button
          onClick={handleRepost}
          disabled={reposted || data.isOwnOriginal}
          className={`flex items-center gap-1.5 text-[12px] font-semibold ${reposted ? 'text-accent2' : 'text-text2'} disabled:opacity-50`}
        >
          <Repeat2 size={16} strokeWidth={2} />
          {reposted ? t('reposted') : t('repost')}
        </button>
        <button onClick={() => setShowReplies((v) => !v)} className="flex items-center gap-1.5 text-[12px] font-semibold text-text2">
          <MessageCircle size={16} strokeWidth={2} />
          {t('replies', { count: data.replies.length })}
        </button>
      </div>

      {showReplies && (
        <div className="border-t border-border px-3.5 py-3 flex flex-col gap-2.5">
          {data.replies.map((r) => (
            <div key={r.id} className="text-[12px]">
              <span className="font-bold">{r.authorName}: </span>
              <span className="text-text2">{r.body}</span>
            </div>
          ))}
          <form onSubmit={handleReply} className="flex items-center gap-2 mt-1">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t('replyPlaceholder')}
              maxLength={500}
              className="flex-1 bg-sunken border border-border rounded-xl px-3 py-2 text-[12px]"
            />
            <button type="submit" disabled={!replyText.trim() || busy} className="text-accent2 font-bold text-[12px] disabled:opacity-50">
              {t('send')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
