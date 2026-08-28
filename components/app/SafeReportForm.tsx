'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Flag, X } from 'lucide-react';
import { submitSafeReport } from '@/lib/safe-actions';
import { BadgeUnlockedModal } from '@/components/app/BadgeUnlockedModal';

export function SafeReportForm() {
  const t = useTranslations('app.safe');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [urlOrSeller, setUrlOrSeller] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [badgeUnlocked, setBadgeUnlocked] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlOrSeller.trim() || !reason.trim() || busy) return;
    setBusy(true);
    try {
      const result = await submitSafeReport(urlOrSeller, reason);
      if (result.badgeUnlocked) {
        // El modal de badge YA celebra/confirma el envío — no apilar el sheet de "enviado" encima.
        setOpen(false);
        setBadgeUnlocked(true);
      } else {
        setSent(true);
      }
      router.refresh();
    } catch {
      // silencioso a propósito: se deja el formulario abierto con los datos intactos para reintentar
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setSent(false);
    setUrlOrSeller('');
    setReason('');
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full border-2 border-accent text-accent2 font-bold text-[13px] rounded-2xl py-3 mb-4 transition-transform duration-150 active:scale-[0.98]"
      >
        <Flag size={16} strokeWidth={2} />
        {t('report')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(11,7,16,0.8)' }} onClick={close}>
          <div className="bg-surface border border-border rounded-t-[24px] sm:rounded-[24px] p-5 w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            {!sent ? (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold">{t('formTitle')}</div>
                  <button type="button" onClick={close} aria-label={t('close')} className="text-text2 p-1">
                    <X size={18} strokeWidth={2} />
                  </button>
                </div>
                <label className="block text-xs font-semibold text-text2 mb-1.5">{t('formUrlLabel')}</label>
                <input
                  value={urlOrSeller}
                  onChange={(e) => setUrlOrSeller(e.target.value)}
                  placeholder={t('formUrlPlaceholder')}
                  maxLength={300}
                  required
                  className="w-full bg-sunken border border-border rounded-xl px-3.5 py-3 text-sm mb-3.5 outline-none focus:border-accent"
                />
                <label className="block text-xs font-semibold text-text2 mb-1.5">{t('formReasonLabel')}</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('formReasonPlaceholder')}
                  maxLength={500}
                  required
                  rows={3}
                  className="w-full bg-sunken border border-border rounded-xl px-3.5 py-3 text-sm mb-4 outline-none focus:border-accent resize-none"
                />
                <button
                  type="submit"
                  disabled={busy || !urlOrSeller.trim() || !reason.trim()}
                  className="bg-accent-btn text-white font-bold text-[14px] rounded-2xl py-3.5 w-full disabled:opacity-50 transition-transform duration-150 active:scale-[0.97]"
                  style={{ boxShadow: 'var(--glow)' }}
                >
                  {busy ? t('formSending') : t('formSubmit')}
                </button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="text-sm font-bold mb-1.5">{t('formSentTitle')}</div>
                <p className="text-xs text-text2 mb-5">{t('formSentBody')}</p>
                <button onClick={close} className="bg-accent-btn text-white font-bold text-[14px] rounded-2xl py-3 w-full" style={{ boxShadow: 'var(--glow)' }}>
                  {t('close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {badgeUnlocked && (
        <BadgeUnlockedModal name={t('firstReportBadgeName')} description={t('firstReportBadgeDesc')} icon="🛡️" />
      )}
    </>
  );
}
