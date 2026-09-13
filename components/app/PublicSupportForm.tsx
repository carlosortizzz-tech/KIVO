'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { submitPublicSupportTicket, type PublicCategory } from '@/lib/support-actions';

// Para gente que TODAVÍA NO puede entrar a KIVO — vive fuera de la app (login), sin sesión.
// Contraparte de SupportForm (dentro de la app): ahí "no me llegó el acceso" no tenía sentido
// porque para llegar a ese formulario ya hay que estar logueado (hallazgo real del usuario).
const CATEGORIES = ['access', 'other'] as const satisfies readonly PublicCategory[];
type Category = (typeof CATEGORIES)[number];
const categoryKey: Record<Category, string> = {
  access: 'catAccess',
  other: 'catOther',
};

export function PublicSupportForm({ triggerLabel, supportEmail }: { triggerLabel: string; supportEmail: string }) {
  const t = useTranslations('cuenta.support');
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>('access');
  const [email, setEmail] = useState('');
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
    if (!email.trim() || !message.trim() || busy) return;
    setBusy(true);
    setError(false);
    try {
      await submitPublicSupportTicket(email, category, message);
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
    setEmail('');
    setMessage('');
    setCategory('access');
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        type="button"
        className="text-[13px] font-bold text-accent2 underline underline-offset-2 text-center"
      >
        {triggerLabel}
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

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  required
                  autoFocus
                  className="w-full bg-sunken border border-border rounded-[var(--radius-btn)] px-3.5 py-3 text-sm mb-3 outline-none focus:border-accent"
                />

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('placeholder')}
                  maxLength={2000}
                  required
                  rows={4}
                  className="w-full bg-sunken border border-border rounded-[var(--radius-btn)] px-3.5 py-3 text-sm mb-3 outline-none focus:border-accent resize-none"
                />
                <p className="text-[11px] text-text2 mb-4">{t('sla')}</p>

                {error && <p className="text-xs text-danger mb-3 -mt-2">{t('formError')}</p>}

                <button
                  type="submit"
                  disabled={busy || !email.trim() || !message.trim()}
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
