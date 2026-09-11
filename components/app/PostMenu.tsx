'use client';

import { useEffect, useRef, useState } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  // Ronda 2 del revisor-visual: el menú se quedaba flotando abierto si el usuario tocaba
  // afuera — cierra con click/tap fuera y con Escape, mismo estándar que ExperienceCard.
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await deleteForumPost(postId);
      close();
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => (open ? close() : setOpen(true))} aria-label={t('moreOptions')} className="text-text2 p-1">
        <MoreVertical size={16} strokeWidth={2} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl overflow-hidden z-10 min-w-[160px]"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          {confirming ? (
            <div className="px-3.5 py-2.5">
              <div className="text-xs text-text mb-2.5">{t('deleteConfirm')}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="flex-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-sunken text-text2 disabled:opacity-50"
                >
                  {t('composeCancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="flex-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-danger text-white disabled:opacity-50"
                >
                  {busy ? t('deleting') : t('deletePost')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-xs text-danger"
            >
              <Trash2 size={14} strokeWidth={2} />
              {t('deletePost')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
