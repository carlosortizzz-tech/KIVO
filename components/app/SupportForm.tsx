'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LifeBuoy, X } from 'lucide-react';
import { submitSupportTicket } from '@/lib/support-actions';

const CATEGORIES = ['access', 'payment', 'bug', 'other'] as const;
type Category = (typeof CATEGORIES)[number];
const categoryKey: Record<Category, string> = {
  access: 'catAccess',
  payment: 'catPayment',
  bug: 'catBug',
  other: 'catOther',
};

export function SupportForm({ supportEmail }: { supportEmail: string }) {
  const t = useTranslations('cuenta.support');
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>('access');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(false);
    try {
      await submitSupportTicket(category, message);
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setShown(false);
    setSent(false);
    setError(false);
    setMessage('');
    setCategory('access');
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        type="button"
        className="flex items-center gap-3 surface-elevated rounded-[var(--radius-card)] px-4 py-3.5 w-full text-left transition-transform duration-150 active:scale-[0.98]"
      >
        <div className="icon-chip-accent firma-icon w-9 h-9 rounded-[var(--radius-btn)] flex items-center justify-center flex-shrink-0">
          <LifeBuoy size={16} strokeWidth={2} />
        </div>
        <span className="flex-1 text-sm">{t('openLabel')}</span>
      </button>

      {open && (
        <div
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-opacity duration-250 ease-out ${shown ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'rgba(11,7,16,0.8)' }}
          onClick={close}
        >
          <div
            className={`bg-surface border border-border rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)] p-5 w-full max-w-[420px] transition-transform duration-250 ease-out ${shown ? 'translate-y-0' : 'translate-y-4'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {!sent ? (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold">{t('formTitle')}</div>
                  <button type="button" onClick={close} aria-label={t('close')} className="text-text2 p-1">
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
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('placeholder')}
                  maxLength={2000}
                  required
                  rows={4}
                  autoFocus
                  className="w-full bg-sunken border border-border rounded-[var(--radius-btn)] px-3.5 py-3 text-sm mb-3 outline-none focus:border-accent resize-none"
                />
                <p className="text-[11px] text-text2 mb-4">{t('sla')}</p>

                {error && <p className="text-xs text-danger mb-3 -mt-2">{t('formError')}</p>}

                <button
                  type="submit"
                  disabled={busy || !message.trim()}
                  className="bg-accent-btn text-white font-bold text-[14px] rounded-[var(--radius-btn)] py-3.5 w-full disabled:opacity-50 transition-transform duration-150 active:scale-[0.97]"
                  style={{ boxShadow: 'var(--glow)' }}
                >
                  {busy ? t('sending') : t('submit')}
                </button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="text-sm font-bold mb-1.5">{t('sentTitle')}</div>
                <p className="text-xs text-text2 mb-2">{t('sentBody')}</p>
                <p className="text-xs text-text2 mb-5">{supportEmail}</p>
                <button onClick={close} className="bg-accent-btn text-white font-bold text-[14px] rounded-[var(--radius-btn)] py-3 w-full" style={{ boxShadow: 'var(--glow)' }}>
                  {t('close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
