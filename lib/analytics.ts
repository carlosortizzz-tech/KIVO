// Punto único de entrada a PostHog — los componentes SOLO importan estas funciones,
// nunca `posthog-js` directo (ver docs/sistema/36-ANALITICA-Y-EVENTOS.md).
'use client';

// posthog-js se carga con import() dinámico, NUNCA estático arriba del archivo — este módulo se
// monta en el layout raíz, que envuelve TODAS las páginas incluida la landing pública. Un import
// estático mete ~80KB comprimidos de JS en el camino crítico de la página que más necesita ser
// liviana para convertir (38-PERFORMANCE-BUDGET: landing < 130KB JS). Medido en producción antes
// de este fix: la landing cargaba ~276KB de JS, muy por encima del presupuesto.
type PostHogModule = typeof import('posthog-js').default;

let posthogInstance: PostHogModule | null = null;
let initialized = false;
let readyPromise: Promise<void> | null = null;

export function initAnalytics() {
  if (typeof window === 'undefined' || initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return; // sin llave configurada, no-op silencioso (no rompe nada)
  initialized = true;
  readyPromise = import('posthog-js').then(({ default: posthog }) => {
    posthogInstance = posthog;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      // 'memory': sin cookie de consentimiento todavía (47), no persiste entre recargas — decisión
      // deliberada para no requerir un banner de cookies antes de tener el checkbox legal de 47.
      persistence: 'memory',
      capture_pageview: false,
      autocapture: false,
    });
  });
}

export async function track(evento: string, props: Record<string, unknown> = {}) {
  if (!initialized) return;
  await readyPromise;
  posthogInstance?.capture(evento, props);
}

export async function identifyUser(userId: string, plan: string, source: string) {
  if (!initialized) return;
  await readyPromise;
  posthogInstance?.identify(userId, { plan, source });
}

export async function resetAnalytics() {
  if (!initialized) return;
  await readyPromise;
  posthogInstance?.reset();
}
