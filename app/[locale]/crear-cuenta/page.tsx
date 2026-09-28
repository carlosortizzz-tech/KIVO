'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Reveal } from '@/components/app/Reveal';
import { Link } from '@/i18n/navigation';
import { getDistinctId } from '@/lib/analytics';
import { getAttribution } from '@/lib/attribution';
import { useIsInAppBrowser } from '@/lib/in-app-browser';

const ONBOARDING_STORAGE_KEY = 'kivo_onboarding_state';
const ONBOARDING_KEYS = ['antiguedad', 'dolor', 'plataforma', 'aviso'] as const;

// Las respuestas del onboarding viven en localStorage de ESTE navegador — si el enlace del correo
// se abre en otro (lo normal viniendo de Instagram), el paywall no las encontraría. Viajan también
// en la cuenta (user_metadata.onboarding) y el paywall las usa como respaldo.
function readOnboardingAnswers(): Record<string, string> | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? 'null');
    const respuestas = parsed?.v === 1 ? parsed.respuestas : null;
    if (!respuestas) return undefined;
    const clean: Record<string, string> = {};
    for (const key of ONBOARDING_KEYS) {
      if (typeof respuestas[key] === 'string') clean[key] = respuestas[key];
    }
    return Object.keys(clean).length ? clean : undefined;
  } catch {
    return undefined; // localStorage bloqueado o JSON corrupto: se registra igual, sin respuestas
  }
}

export default function CrearCuentaPage() {
  const t = useTranslations('crearCuenta');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inApp = useIsInAppBrowser();
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
    // Cose el funnel de PostHog a través del salto del enlace mágico (36-ANALITICA-Y-EVENTOS):
    // el click en el correo recarga la página (casi siempre en OTRO navegador), lo que borra la
    // identidad anónima en memoria de PostHog. Viaja guardada en la cuenta y /auth/confirm la
    // "cose" a la cuenta real vía alias server-side (lib/auth-finalize.ts).
    const phid = await getDistinctId();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Sigue apuntando a /auth/callback para funcionar con la plantilla de correo vieja (PKCE) y
        // con la nueva (token_hash → /auth/confirm, que lo recibe como `next={{ .RedirectTo }}`).
        // Sin parámetros a propósito: la plantilla nueva pega este valor tal cual en `next=`, y un
        // "&" lo partiría. El destino (paywall) lo decide lib/auth-redirect.ts.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Solo se guarda al CREAR la cuenta (Supabase ignora `data` si el correo ya existía).
        // `locale`: KIVO vuelve en el idioma del registro desde cualquier dispositivo.
        // `source`: de qué link vino (lib/attribution.ts) — handle_new_user lo escribe en
        // profiles.source, primer toque, para siempre (36-ANALITICA-Y-EVENTOS).
        data: { locale, source: getAttribution(), phid: phid ?? undefined, onboarding: readOnboardingAnswers() },
      },
    });
    setLoading(false);
    if (error) {
      setError(t('error'));
      return;
    }
    setSent(true);
  }

  async function handleGoogle() {
    if (!consent) {
      setError(t('consentRequired'));
      return;
    }
    const supabase = createClient();
    // Google no tiene un campo `data` como el OTP — la atribución y la identidad anónima de
    // PostHog viajan por la URL de retorno y /auth/callback las aplica (lib/auth-finalize.ts).
    // Sin `phid` aquí, el onboarding y el paywall de quien entraba con Google quedaban como 2
    // personas distintas en el funnel. Google vuelve al MISMO navegador, así que las respuestas
    // del onboarding siguen en localStorage y no hace falta mandarlas.
    const phid = await getDistinctId();
    const redirectUrl = new URL(`${window.location.origin}/auth/callback`);
    redirectUrl.searchParams.set('source', getAttribution());
    if (phid) redirectUrl.searchParams.set('phid', phid);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl.toString() },
    });
    if (error) setError(t('error'));
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

            {inApp ? (
              <p className="text-xs text-text2 text-center leading-relaxed bg-surface border border-border rounded-2xl px-4 py-3">
                {t('inAppNotice')}
              </p>
            ) : (
              <>
                <button
                  onClick={handleGoogle}
                  type="button"
                  disabled={!consent}
                  className="flex items-center justify-center gap-2.5 bg-surface border border-border rounded-2xl py-4 px-5 font-bold text-[15px] transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
                >
                  {t('google')}
                </button>

                <div className="flex items-center gap-3 text-text2 text-xs">
                  <span className="flex-1 h-px bg-border" /> {t('or')} <span className="flex-1 h-px bg-border" />
                </div>
              </>
            )}

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
