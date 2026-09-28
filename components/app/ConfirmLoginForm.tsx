'use client';

import { useState } from 'react';

// Formulario de /confirmar: hace POST a /auth/confirm, que es donde recién se canjea el enlace.
// El botón se bloquea al primer toque — un segundo envío gastaría el mismo enlace otra vez y
// terminaría en "enlace vencido" aunque el primero haya funcionado.
export function ConfirmLoginForm({
  tokenHash,
  type,
  next,
  ctaLabel,
  sendingLabel,
}: {
  tokenHash: string;
  type: string;
  next: string | null;
  ctaLabel: string;
  sendingLabel: string;
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      method="post"
      action="/auth/confirm"
      onSubmit={(e) => {
        if (submitting) {
          e.preventDefault();
          return;
        }
        setSubmitting(true);
      }}
      className="w-full"
    >
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      {next && <input type="hidden" name="next" value={next} />}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 disabled:opacity-60 transition-transform duration-150 active:scale-[0.97]"
        style={{ boxShadow: 'var(--glow)' }}
      >
        {submitting ? sendingLabel : ctaLabel}
      </button>
    </form>
  );
}
