'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

// Casilla NO premarcada (Ley 1581: autorización previa y EXPRESA) + registro de la constancia vía
// accept_terms(). Al guardar se navega con recarga completa, para que app/[locale]/app/layout.tsx
// vuelva a leer el perfil y deje pasar.
export function AcceptTermsForm({ next }: { next: string }) {
  const t = useTranslations('aceptar');
  const tc = useTranslations('crearCuenta');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!consent || saving) return;
    setSaving(true);
    setError(null);
    const { error } = await createClient().rpc('accept_terms', { p_source: 'pantalla_aceptacion' });
    if (error) {
      setSaving(false);
      setError(t('error'));
      return;
    }
    window.location.replace(next);
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <label className="flex items-start gap-2.5 py-1 cursor-pointer text-left">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 w-4.5 h-4.5 flex-shrink-0 accent-[var(--accent)]"
        />
        <span className="text-xs text-text2 leading-relaxed">
          {tc.rich('consent', {
            terms: (chunks) => <Link href="/terminos" className="text-accent2">{chunks}</Link>,
            privacy: (chunks) => <Link href="/privacidad" className="text-accent2">{chunks}</Link>,
          })}
        </span>
      </label>
      {error && <p role="alert" className="text-xs text-danger text-center">{error}</p>}
      <button
        type="button"
        onClick={handleAccept}
        disabled={!consent || saving}
        className="w-full bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 disabled:opacity-50 transition-transform duration-150 active:scale-[0.97]"
        style={{ boxShadow: 'var(--glow)' }}
      >
        {saving ? t('saving') : t('cta')}
      </button>
    </div>
  );
}
