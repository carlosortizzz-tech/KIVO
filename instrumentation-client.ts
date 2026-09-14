// Sin tracing/replay a propósito (38-PERFORMANCE-BUDGET): KIVO solo necesita captura de errores.
//
// Historia de este archivo (para no repetir intentos ya probados):
// 1. (2026-08-30) `@sentry/nextjs` con Sentry.init directo — nunca se pudo sacar del bundle
//    inicial ni diferir: `browserTracingIntegration` se importa de forma ESTÁTICA e incondicional
//    dentro del propio SDK, y solo se elimina si el bundler inyecta la constante de compilación
//    `__SENTRY_TRACING__=false` (una función del plugin de Webpack de Sentry que Turbopack no
//    soporta hoy). Ningún truco en runtime saca código que ya se importó de forma estática.
// 2. (2026-09-13, antes) Cambio a `@sentry/browser` con imports nombrados — como el archivo nunca
//    importa `browserTracingIntegration`, Turbopack SÍ pudo excluirlo de verdad (270KB→226KB,
//    medido en producción). Pero al armar la lista de integraciones a mano se quedaron AFUERA
//    `globalHandlersIntegration` y `browserApiErrorsIntegration` — las que capturan errores no
//    manejados y rechazos de promesas sin atrapar. Sin ellas, Sentry dejó de capturar errores
//    reales en producción desde ese deploy — corregido aquí, con la lista completa de abajo.
// 3. (2026-09-13, ahora) Diferido a POST-HIDRATACIÓN de verdad: con `browserTracingIntegration`
//    ya fuera del grafo de imports, un `import()` dinámico real de `@sentry/browser` SÍ se separa
//    en su propio chunk (antes, con `@sentry/nextjs`, incluso diferir la LLAMADA no ayudaba,
//    porque el peso venía de imports estáticos dentro del SDK, no de cuándo se invocaba). El
//    riesgo real de diferir (perder errores de los primeros milisegundos) se cubre con la cola de
//    `window.__kivoEarlyErrors` que arma un script plano en `app/[locale]/layout.tsx` — sin costo
//    de bundle — y que este archivo drena apenas Sentry está listo.

export {};

declare global {
  interface Window {
    __kivoEarlyErrors?: Array<{ message: string; stack?: string; filename?: string; lineno?: number }>;
  }
}

function loadSentry() {
  import('@sentry/browser').then(
    ({
      init,
      captureException,
      dedupeIntegration,
      inboundFiltersIntegration,
      functionToStringIntegration,
      httpContextIntegration,
      linkedErrorsIntegration,
      globalHandlersIntegration,
      browserApiErrorsIntegration,
    }) => {
      init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
        defaultIntegrations: false,
        integrations: [
          dedupeIntegration(),
          inboundFiltersIntegration(),
          functionToStringIntegration(),
          httpContextIntegration(),
          linkedErrorsIntegration(),
          globalHandlersIntegration(),
          browserApiErrorsIntegration(),
        ],
      });

      for (const e of window.__kivoEarlyErrors ?? []) {
        const err = new Error(e.message);
        if (e.stack) err.stack = e.stack;
        captureException(err, { tags: { early: true, filename: e.filename ?? '', lineno: String(e.lineno ?? '') } });
      }
      window.__kivoEarlyErrors = [];
    }
  );
}

if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadSentry, { timeout: 4000 });
  } else {
    setTimeout(loadSentry, 1);
  }
}
