'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Reveal } from '@/components/app/Reveal';
import { Link } from '@/i18n/navigation';

export default function CrearCuentaPage() {
  const t = useTranslations('crearCuenta');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ley 1581 de Colombia (y equivalentes LATAM, ver docs/sistema/47): autorización previa EXPRESA
  // vía checkbox NO premarcado — no basta con "al continuar aceptas" implícito en el botón.
  const [consent, setConsent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError(t('consentRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // El idioma con el que alguien se registra queda atado a su cuenta (handle_new_user lo
        // lee de acá) — así vuelve a KIVO en el mismo idioma sin importar desde qué dispositivo.
        data: { locale },
      },
    });
    setLoading(false);
    if (error) {
      setError(t('error'));
      return;
    }
    setSent(true);
  }

  return (
    <div className="max-w-[420px] mx-auto w-full min-h-dvh flex flex-col px-5">
      <div className="flex items-center justify-center py-6">
        <div className="relative inline-block font-display font-extrabold text-xl">
          <span className="relative z-10 text-accent2" style={{ textShadow: '0 0 18px rgba(180,79,245,0.7)' }}>KIVO</span>
        </div>
      </div>

      {!sent ? (
        <Reveal>
          <div className="flex-1 flex flex-col justify-center gap-5 pb-8">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2 text-center">{t('eyebrow')}</div>
            <h1 className="font-display text-2xl font-extrabold text-center">{t('title')}</h1>
            <p className="text-sm text-text2 text-center leading-relaxed">{t('body')}</p>

            <label className="flex items-start gap-2.5 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4.5 h-4.5 flex-shrink-0 accent-[var(--accent)]"
              />
              <span className="text-[11px] text-text2 leading-relaxed">
                {t.rich('consent', {
                  terms: (chunks) => <Link href="/terminos" className="text-accent2">{chunks}</Link>,
                  privacy: (chunks) => <Link href="/privacidad" className="text-accent2">{chunks}</Link>,
                })}
              </span>
            </label>
            {error && <p className="text-xs text-danger text-center -mt-2">{error}</p>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('placeholder')}
                className="bg-surface border border-border rounded-2xl px-4 py-4 text-[15px] text-text outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={loading || !consent}
                className="bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 disabled:opacity-50 transition-transform duration-150 active:scale-[0.97]"
                style={{ boxShadow: 'var(--glow)' }}
              >
                {loading ? t('sending') : t('sendMagicLink')}
              </button>
            </form>

            <p className="text-[11px] text-text2 text-center leading-relaxed">{t('legal')}</p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <div className="flex-1 flex flex-col items-center justify-center gap-3.5 text-center pb-8">
            <div className="firma-icon w-14 h-14 rounded-full flex items-center justify-center bg-success/15" style={{ boxShadow: '0 0 24px rgba(52,211,153,0.3)' }}>
              <Check size={22} strokeWidth={3} color="var(--success)" />
            </div>
            <h1 className="font-display text-xl font-extrabold">{t('sentTitle')}</h1>
            <p className="text-sm text-text2">{t('sentBody', { email })}</p>
          </div>
        </Reveal>
      )}
    </div>
  );
}
