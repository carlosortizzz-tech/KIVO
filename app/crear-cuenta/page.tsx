'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Reveal } from '@/components/app/Reveal';

export default function CrearCuentaPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError('No pudimos enviar el enlace. Revisa tu correo e intenta de nuevo.');
      return;
    }
    setSent(true);
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
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
            <div className="text-xs font-bold uppercase tracking-wide text-accent2 text-center">Último paso antes de tu plan</div>
            <h1 className="font-display text-2xl font-extrabold text-center">Guarda tu Radar antes de que se pierda</h1>
            <p className="text-sm text-text2 text-center leading-relaxed">
              Tu calendario personalizado ya está listo. Crea tu cuenta gratis para no perderlo — sin contraseñas, entras con tu correo.
            </p>

            <button
              onClick={handleGoogle}
              type="button"
              className="flex items-center justify-center gap-2.5 bg-surface border border-border rounded-2xl py-4 px-5 font-bold text-[15px] transition-transform duration-150 active:scale-[0.98]"
            >
              Continuar con Google
            </button>

            <div className="flex items-center gap-3 text-text2 text-xs">
              <span className="flex-1 h-px bg-border" /> o con tu correo <span className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="bg-surface border border-border rounded-2xl px-4 py-4 text-[15px] text-text outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 disabled:opacity-50 transition-transform duration-150 active:scale-[0.97]"
                style={{ boxShadow: 'var(--glow)' }}
              >
                {loading ? 'Enviando…' : 'Enviar enlace mágico →'}
              </button>
              {error && <p className="text-xs text-danger text-center">{error}</p>}
            </form>

            <p className="text-[11px] text-text2 text-center leading-relaxed">
              Al continuar aceptas los <a href="/terminos" className="text-accent2">Términos</a> y la <a href="/privacidad" className="text-accent2">Política de Privacidad</a>. No pedimos contraseña ni cobramos nada todavía.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <div className="flex-1 flex flex-col items-center justify-center gap-3.5 text-center pb-8">
            <div className="firma-icon w-14 h-14 rounded-full flex items-center justify-center bg-success/15" style={{ boxShadow: '0 0 24px rgba(52,211,153,0.3)' }}>
              <Check size={22} strokeWidth={3} color="var(--success)" />
            </div>
            <h1 className="font-display text-xl font-extrabold">Revisa tu correo</h1>
            <p className="text-sm text-text2">
              Te mandamos un enlace a <b className="text-text">{email}</b>. Ábrelo desde el mismo celular para entrar directo a tu Radar.
            </p>
          </div>
        </Reveal>
      )}
    </div>
  );
}
