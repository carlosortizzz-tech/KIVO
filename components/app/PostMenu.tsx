'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { MoreVertical, Trash2 } from 'lucide-react';
import { deleteForumPost } from '@/lib/community-actions';

// Cierra el defecto que encontró el revisor-visual: una vez publicado, el post no tenía
// NINGÚN punto de control (Nielsen h3, libertad del usuario) — este menú es el único que
// aparece, y solo en las cards del propio autor (page.tsx decide cuándo montarlo).
export function PostMenu({ postId }: { postId: string }) {
  const t = useTranslations('app.community');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await deleteForumPost(postId);
      setOpen(false);
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label={t('moreOptions')} className="text-text2 p-1">
        <MoreVertical size={16} strokeWidth={2} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl overflow-hidden z-10 min-w-[160px]"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          <button
            onClick={handleDelete}
            disabled={busy}
            className="flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-xs text-danger disabled:opacity-50"
          >
            <Trash2 size={14} strokeWidth={2} />
            {busy ? t('deleting') : t('deletePost')}
          </button>
        </div>
      )}
    </div>
  );
}
