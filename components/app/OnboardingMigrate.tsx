'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'kivo_onboarding_state';

// Antes el paywall era la primera pantalla tras el registro y guardaba aquí las respuestas del
// onboarding en la cuenta (aviso de regalo del próximo evento, insignia). Ahora la persona entra
// directo a /app, así que se hace aquí. Primero lo de este navegador; si no hay (el enlace del
// correo casi siempre abre en OTRO navegador), lo guardado en la cuenta al registrarse. El endpoint
// es idempotente: si falla, se reintenta en la próxima visita.
export function OnboardingMigrate() {
  // Una sola migración por montaje: sin esto, el modo estricto de desarrollo ejecuta el efecto dos
  // veces y la segunda llamada choca con el aviso que acaba de crear la primera (duplicate key).
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const saved = data.user.user_metadata?.onboarding;
      const fromAccount = saved && typeof saved === 'object' ? JSON.stringify({ v: 1, respuestas: saved }) : null;
      const raw = localStorage.getItem(STORAGE_KEY) ?? fromAccount;
      if (!raw) return;

      fetch('/api/onboarding/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: raw,
      })
        .then(async (res) => {
          if (!res.ok) return;
          localStorage.removeItem(STORAGE_KEY);
          if (fromAccount) {
            const { error } = await supabase.auth.updateUser({ data: { onboarding: null } });
            if (error) console.error('clear onboarding metadata failed', error.message);
          }
        })
        .catch(() => {});
    });
  }, []);

  return null;
}
