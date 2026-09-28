'use client';

import { useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { PublicSupportForm } from '@/components/app/PublicSupportForm';
import { Link } from '@/i18n/navigation';
import { useIsInAppBrowser } from '@/lib/in-app-browser';

const subscribeNever = () => () => {};

export default function LoginPage() {
  const t = useTranslations('login');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inApp = useIsInAppBrowser();
  // /auth/confirm y /auth/callback mandan aquí con ?error=link cuando el enlace ya no sirve —
  // antes aterrizaban en esta pantalla sin ninguna explicación. El aviso se oculta en cuanto
  // piden un enlace nuevo.
  const cameFromBrokenLink = useSyncExternalStore(
    subscribeNever,
    () => new URLSearchParams(window.location.search).get('error') === 'link',
    () => false
  );
  const [linkNoticeDismissed, setLinkNoticeDismissed] = useState(false);
  const shownError = error ?? (cameFromBrokenLink && !linkNoticeDismissed ? t('linkError') : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLinkNoticeDismissed(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Funciona con la plantilla de correo vieja (PKCE, canje en /auth/callback) y con la nueva
      // (token_hash → /auth/confirm recibe esto como `next` y desenvuelve el /app interno). Un solo
      // parámetro a propósito: la plantilla nueva pega este valor tal cual y un "&" lo partiría.
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
        // /login solo ENTRA a cuentas existentes: crear cuenta exige la casilla de autorización de
        // datos (Ley 1581), que vive en /crear-cuenta. Antes /login creaba cuentas sin mostrarla.
        shouldCreateUser: false,
      },
    });
    setLoading(false);
    // Correo sin cuenta (`otp_disabled`): se muestra el MISMO mensaje que si existiera — decir
    // "esa cuenta no existe" revelaría qué correos están registrados (26-AUTH-MODERNO). El mensaje
    // enviado es neutro y debajo siempre está "¿Aún no tienes cuenta?".
    // Otros errores sí se muestran: antes se decía "te mandamos un enlace" aunque el envío fallara
    // (ej. límite de correos por minuto) y la persona esperaba un correo que nunca iba a llegar.
    if (error && error.code !== 'otp_disabled') {
      setError(t('error'));
      return;
    }
    setSent(true);
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/app` },
    });
  }

  return (
    <div className="max-w-[420px] mx-auto w-full min-h-dvh flex flex-col justify-center px-5 gap-5">
      <div className="text-center font-display font-extrabold text-xl text-accent2" style={{ textShadow: '0 0 18px rgba(180,79,245,0.7)' }}>KIVO</div>
      {!sent ? (
        <>
          <h1 className="font-display text-xl font-extrabold text-center">{t('title')}</h1>
          {shownError && <p role="alert" className="text-xs text-danger text-center leading-relaxed">{shownError}</p>}
          {inApp ? (
            <p className="text-xs text-text2 text-center leading-relaxed bg-surface border border-border rounded-[var(--radius-card)] px-4 py-3">
              {t('inAppNotice')}
            </p>
          ) : (
            <>
              <button
                onClick={handleGoogle}
                type="button"
                className="flex items-center justify-center gap-2.5 bg-surface border border-border rounded-[var(--radius-card)] py-4 px-5 font-bold text-[15px] transition-transform duration-150 active:scale-[0.98]"
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
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t('placeholder')}
              className="bg-surface border border-border rounded-[var(--radius-card)] px-4 py-4 text-[15px] outline-none focus:border-accent"
            />
            <button type="submit" disabled={loading} className="bg-accent-btn text-white font-bold text-[15px] rounded-[var(--radius-card)] py-4 disabled:opacity-50 transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
              {loading ? t('sending') : t('sendMagicLink')}
            </button>
          </form>
        </>
      ) : (
        <p className="text-sm text-text2 text-center">{t('sentBody', { email })}</p>
      )}
      <p className="text-sm text-text2 text-center">
        {t('noAccount')}{' '}
        <Link href="/onboarding" className="font-bold text-accent2 underline underline-offset-2">{t('createAccount')}</Link>
      </p>
      <PublicSupportForm triggerLabel={t('needHelp')} supportEmail="soporte@kivoapp.app" />
    </div>
  );
}
