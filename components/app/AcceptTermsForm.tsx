'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { confirmAge } from '@/lib/age-actions';
import { ageFromBirthYear, birthYearOptions, MIN_AGE, MINOR_AGE } from '@/lib/age';

// Casilla NO premarcada (Ley 1581: autorización previa y EXPRESA) + registro de la constancia vía
// accept_terms(), y confirmación de la edad (año de nacimiento, mínimo 13). Cada paso se muestra
// solo si a esta cuenta le falta. Al guardar se navega con recarga completa, para que
// app/[locale]/app/layout.tsx vuelva a leer el perfil y deje pasar.
export function AcceptTermsForm({ next, needsConsent, needsAge }: { next: string; needsConsent: boolean; needsAge: boolean }) {
  const t = useTranslations('aceptar');
  const tc = useTranslations('crearCuenta');
  const [consent, setConsent] = useState(false);
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [underage, setUnderage] = useState(false);

  const yearNum = year ? Number(year) : null;
  const age = yearNum ? ageFromBirthYear(yearNum) : null;
  const ready = (!needsConsent || consent) && (!needsAge || yearNum !== null);

  async function handleAccept() {
    if (!ready || saving) return;
    setSaving(true);
    setError(null);

    if (needsAge && yearNum !== null) {
      const res = await confirmAge(yearNum);
      if (res.status === 'underage') {
        setSaving(false);
        setUnderage(true);
        return;
      }
      if (res.status === 'error') {
        setSaving(false);
        setError(t('error'));
        return;
      }
    }

    if (needsConsent) {
      const { error } = await createClient().rpc('accept_terms', { p_source: 'pantalla_aceptacion' });
      if (error) {
        setSaving(false);
        setError(t('error'));
        return;
      }
    }
    window.location.replace(next);
  }

  if (underage) {
    return (
      <div className="w-full flex flex-col gap-4 text-center" role="alert">
        <h2 className="font-display text-xl font-extrabold">{t('underageTitle')}</h2>
        <p className="text-sm text-text2 leading-relaxed">{t('underageBody')}</p>
        <button
          type="button"
          onClick={() => window.location.replace('/')}
          className="w-full bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 transition-transform duration-150 active:scale-[0.97]"
        >
          {t('underageCta')}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {needsAge && (
        <div className="flex flex-col gap-2 text-left">
          <label htmlFor="birth-year" className="text-xs font-bold text-text2">{tc('birthYearLabel')}</label>
          <select
            id="birth-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="bg-surface border border-border rounded-2xl px-4 py-4 text-[15px] text-text outline-none focus:border-accent"
          >
            <option value="">{tc('birthYearPlaceholder')}</option>
            {birthYearOptions().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {age !== null && age >= MIN_AGE && age < MINOR_AGE && (
            <p className="text-xs text-text2 leading-relaxed">{tc('minorNote')}</p>
          )}
        </div>
      )}
      {needsConsent && (
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
      )}
      {error && <p role="alert" className="text-xs text-danger text-center">{error}</p>}
      <button
        type="button"
        onClick={handleAccept}
        disabled={!ready || saving}
        className="w-full bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 disabled:opacity-50 transition-transform duration-150 active:scale-[0.97]"
        style={{ boxShadow: 'var(--glow)' }}
      >
        {saving ? t('saving') : t('cta')}
      </button>
    </div>
  );
}
