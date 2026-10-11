'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { deleteAccount } from '@/lib/account-actions';
import { resetAnalytics } from '@/lib/analytics';

// Dos casillas (no premarcadas) antes de poder borrar: entender que no se deshace y, si hay una
// suscripción de pago, haberla cancelado en Hotmart — borrar la cuenta aquí NO cancela el cobro.
export function DeleteAccountForm({ hasPaidPlan }: { hasPaidPlan: boolean }) {
  const t = useTranslations('cuenta');
  const [understood, setUnderstood] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);

  const ready = understood && (!hasPaidPlan || cancelled);

  async function handleDelete() {
    if (!ready || deleting) return;
    setDeleting(true);
    setError(false);
    const res = await deleteAccount();
    if (res.status === 'ok') {
      resetAnalytics();
      setDone(true);
      return;
    }
    setDeleting(false);
    setError(true);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 text-center py-6" role="status">
        <h2 className="font-display text-xl font-extrabold">{t('deletedTitle')}</h2>
        <p className="text-sm text-text2 leading-relaxed">{t('deletedBody')}</p>
        <button
          type="button"
          onClick={() => window.location.replace('/')}
          className="w-full bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 transition-transform duration-150 active:scale-[0.97]"
        >
          {t('deletedCta')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {hasPaidPlan && (
        <div className="bg-warn/[0.08] border border-warn/25 rounded-2xl p-4 text-xs text-text2 leading-relaxed">
          <div className="font-bold text-warn text-sm mb-1">{t('deletePaidTitle')}</div>
          <p>{t('deletePaidBody')}</p>
        </div>
      )}
      {hasPaidPlan && (
        <label className="flex items-start gap-2.5 py-1 cursor-pointer text-left">
          <input
            type="checkbox"
            checked={cancelled}
            onChange={(e) => setCancelled(e.target.checked)}
            className="mt-0.5 w-4.5 h-4.5 flex-shrink-0 accent-[var(--accent)]"
          />
          <span className="text-xs text-text2 leading-relaxed">{t('deletePaidCheck')}</span>
        </label>
      )}
      <label className="flex items-start gap-2.5 py-1 cursor-pointer text-left">
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          className="mt-0.5 w-4.5 h-4.5 flex-shrink-0 accent-[var(--accent)]"
        />
        <span className="text-xs text-text2 leading-relaxed">{t('deleteAckCheck')}</span>
      </label>
      {error && <p role="alert" className="text-xs text-danger text-center">{t('deleteError')}</p>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={!ready || deleting}
        className="w-full text-center text-sm font-bold text-danger py-3.5 rounded-2xl border border-danger/40 disabled:opacity-50 transition-transform duration-150 active:scale-[0.98]"
      >
        {deleting ? t('deleting') : t('deleteCta')}
      </button>
    </div>
  );
}
