'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const t = useTranslations('login');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/app` },
    });
    setLoading(false);
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
          <button
            onClick={handleGoogle}
            type="button"
            className="flex items-center justify-center gap-2.5 bg-surface border border-border rounded-2xl py-4 px-5 font-bold text-[15px] transition-transform duration-150 active:scale-[0.98]"
          >
            {t('google')}
          </button>
          <div className="flex items-center gap-3 text-text2 text-xs">
            <span className="flex-1 h-px bg-border" /> {t('or')} <span className="flex-1 h-px bg-border" />
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t('placeholder')}
              className="bg-surface border border-border rounded-2xl px-4 py-4 text-[15px] outline-none focus:border-accent"
            />
            <button type="submit" disabled={loading} className="bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 disabled:opacity-50 transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
              {loading ? t('sending') : t('sendMagicLink')}
            </button>
          </form>
        </>
      ) : (
        <p className="text-sm text-text2 text-center">{t('sentBody', { email })}</p>
      )}
    </div>
  );
}
