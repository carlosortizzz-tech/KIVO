'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { submitForumPost } from '@/lib/community-actions';

export const CATEGORIES = ['general', 'pregunta', 'comeback', 'concierto'] as const;
export const categoryKey: Record<(typeof CATEGORIES)[number], string> = {
  general: 'composeCategoryGeneral',
  pregunta: 'composeCategoryPregunta',
  comeback: 'composeCategoryComeback',
  concierto: 'composeCategoryConcierto',
};

export function ComposePost() {
  const t = useTranslations('app.community');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('general');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(false);
    try {
      await submitForumPost(category, body);
      setBody('');
      setOpen(false);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setError(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 bg-surface border border-border rounded-2xl px-3.5 py-3 mb-4 text-sm text-text2 w-full text-left"
      >
        <div className="w-7 h-7 rounded-full bg-accent-btn flex-shrink-0" />
        {t('compose')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(11,7,16,0.8)' }} onClick={close}>
          <div className="bg-surface border border-border rounded-t-[24px] sm:rounded-[24px] p-5 w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold">{t('compose')}</div>
                <button type="button" onClick={close} aria-label={t('composeCancel')} className="text-text2 p-1">
                  <X size={18} strokeWidth={2} />
                </button>
              </div>

              <div className="flex gap-1.5 mb-3.5 flex-wrap">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full transition-colors ${category === c ? 'bg-accent-btn text-white' : 'bg-sunken text-text2'}`}
                  >
                    {t(categoryKey[c])}
                  </button>
                ))}
              </div>

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('composePlaceholder')}
                maxLength={500}
                required
                rows={4}
                autoFocus
                className="w-full bg-sunken border border-border rounded-xl px-3.5 py-3 text-sm mb-4 outline-none focus:border-accent resize-none"
              />

              {error && <p className="text-xs text-danger mb-3 -mt-2">{t('composeError')}</p>}

              <button
                type="submit"
                disabled={busy || !body.trim()}
                className="bg-accent-btn text-white font-bold text-[14px] rounded-2xl py-3.5 w-full disabled:opacity-50 transition-transform duration-150 active:scale-[0.97]"
                style={{ boxShadow: 'var(--glow)' }}
              >
                {busy ? t('composeSending') : t('composeSubmit')}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
