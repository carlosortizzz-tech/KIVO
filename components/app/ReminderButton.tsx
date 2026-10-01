'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Bell, BellRing, Loader2, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

// Modelo de cobro (02C, decidido 2026-09-30): el plan gratis incluye 1 aviso ACTIVO de regalo
// (correo 48 h y 1 h antes); Pro avisa de TODO. El momento de pagar es cuando alguien quiere un
// segundo aviso — ahí se le ofrece Pro o mover su aviso gratis, nunca un bloqueo seco.
// La regla vive en la base de datos (activate_event_reminder); esto solo la presenta.
export function ReminderButton({
  eventId,
  eventTitle,
  plan,
  isActive,
  giftEventTitle,
  compact = false,
}: {
  eventId: string;
  eventTitle: string;
  plan: 'free' | 'pro';
  isActive: boolean;
  // Título del evento donde el usuario gratis tiene hoy su aviso de regalo (null si no tiene).
  giftEventTitle: string | null;
  compact?: boolean;
}) {
  const t = useTranslations('app.radar');
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  // Pro: todos los eventos ya tienen aviso — se informa, no se ofrece un botón que no hace nada.
  if (plan === 'pro') {
    return (
      <span className={`inline-flex items-start gap-1.5 font-bold text-accent2 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        <BellRing size={compact ? 12 : 14} strokeWidth={2.2} className="mt-px flex-shrink-0" />
        {t('reminderPro')}
      </span>
    );
  }

  // Aviso gratis activo en ESTE evento: se puede quitar (antes solo se podía "mover" desde otra
  // tarjeta — revisor-visual 2026-09-30, control del usuario).
  if (isActive) {
    return (
      <span className={`inline-flex items-center flex-wrap gap-x-2 gap-y-1 font-bold text-accent2 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        <span className="inline-flex items-start gap-1.5">
          <BellRing size={compact ? 12 : 14} strokeWidth={2.2} className="mt-px flex-shrink-0" />
          {compact ? t('reminderActiveShort') : t('reminderActive')}
        </span>
        <button
          type="button"
          onClick={removeReminder}
          disabled={saving}
          className="min-h-11 px-2 -my-3 font-semibold text-text2 underline underline-offset-2 disabled:opacity-60"
        >
          {t('reminderRemove')}
        </button>
        {error && <span role="alert" className="basis-full text-danger font-normal">{error}</span>}
      </span>
    );
  }

  async function removeReminder() {
    setSaving(true);
    setError(null);
    // RLS (own_reminders) limita el borrado a los avisos propios.
    const { error } = await createClient().from('event_reminders').delete().eq('event_id', eventId);
    setSaving(false);
    if (error) {
      setError(t('reminderError'));
      return;
    }
    router.refresh();
  }

  async function activate(replace: boolean) {
    setSaving(true);
    setError(null);
    const { data, error } = await createClient().rpc('activate_event_reminder', { p_event_id: eventId, p_replace: replace });
    setSaving(false);
    if (error) {
      setError(t('reminderError'));
      return;
    }
    if (data === 'free_limit') {
      setSheetOpen(true);
      return;
    }
    setSheetOpen(false);
    router.refresh(); // el aviso activo cambia en todas las tarjetas de la pantalla
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (giftEventTitle ? setSheetOpen(true) : activate(false))}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 font-bold text-accent2 border border-accent/40 rounded-[var(--radius-btn)] transition-transform duration-150 active:scale-[0.97] disabled:opacity-60 min-h-11 ${compact ? 'text-[11px] px-2.5 py-1' : 'text-xs px-3 py-1.5'}`}
      >
        {saving ? <Loader2 size={compact ? 12 : 14} className="animate-spin" /> : <Bell size={compact ? 12 : 14} strokeWidth={2.2} />}
        {giftEventTitle ? t('remindMe') : t('remindMeFree')}
      </button>
      {error && <span role="alert" className="block text-[11px] text-danger mt-1">{error}</span>}

      {/* Portal a <body>: las tarjetas del Radar animan su entrada con transform (Reveal), y un
          `fixed` dentro de un ancestro con transform queda atrapado en la tarjeta (QA 2026-09-30). */}
      {sheetOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setSheetOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`reminder-limit-${eventId}`}
            className="w-full max-w-[480px] surface-elevated rounded-t-[var(--radius-card)] p-5 pb-8 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={`reminder-limit-${eventId}`} className="font-display text-lg font-extrabold">
                {t('limitTitle', { event: giftEventTitle ?? '' })}
              </h2>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label={t('limitClose')} className="min-w-11 min-h-11 -mr-2 -mt-2 flex items-center justify-center text-text2">
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <p className="text-sm text-text2 leading-relaxed">{t('limitBody', { event: eventTitle })}</p>
            <Link
              href={{ pathname: '/paywall', query: { evento: eventId } }}
              className="block text-center bg-accent-btn text-white font-bold text-[15px] rounded-[var(--radius-btn)] py-3.5 transition-transform duration-150 active:scale-[0.97]"
              style={{ boxShadow: 'var(--glow)' }}
            >
              {t('limitPro')}
            </Link>
            <button
              type="button"
              onClick={() => activate(true)}
              disabled={saving}
              className="text-center text-sm font-bold text-text py-3 rounded-[var(--radius-btn)] border border-border disabled:opacity-60"
            >
              {saving ? t('reminderSaving') : t('limitMove', { event: eventTitle })}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
