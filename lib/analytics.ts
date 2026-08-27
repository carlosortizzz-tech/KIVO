// Punto único de entrada a PostHog — los componentes SOLO importan estas funciones,
// nunca `posthog-js` directo (ver docs/sistema/36-ANALITICA-Y-EVENTOS.md).
'use client';

import posthog from 'posthog-js';

let initialized = false;

export function initAnalytics() {
  if (typeof window === 'undefined' || initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return; // sin llave configurada, no-op silencioso (no rompe nada)
  initialized = true;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // 'memory': sin cookie de consentimiento todavía (47), no persiste entre recargas — decisión
    // deliberada para no requerir un banner de cookies antes de tener el checkbox legal de 47.
    persistence: 'memory',
    capture_pageview: false,
    autocapture: false,
  });
}

export function track(evento: string, props: Record<string, unknown> = {}) {
  if (!initialized) return;
  posthog.capture(evento, props);
}

export function identifyUser(userId: string, plan: string, source: string) {
  if (!initialized) return;
  posthog.identify(userId, { plan, source });
}

export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}
