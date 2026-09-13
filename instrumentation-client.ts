// Sin tracing/replay a propósito (38-PERFORMANCE-BUDGET): KIVO solo necesita captura de errores.
//
// Causa raíz real del peso encontrada 2026-09-13 (las 3 formas de DIFERIR la carga probadas el
// 2026-08-30 no la tocaban porque el problema no era CUÁNDO carga, sino QUÉ se bundlea): el
// `Sentry.init` de `@sentry/nextjs` importa `browserTracingIntegration` de forma ESTÁTICA e
// incondicional en su propio `index.js` — la agrega al array de integraciones por defecto salvo
// que el bundler inyecte la constante de compilación `__SENTRY_TRACING__=false` (el plugin de
// Sentry para Webpack lo hace vía DefinePlugin; Turbopack, hoy, no soporta ese plugin — confirmado
// el 2026-08-30). Como el import es estático, NINGUNA opción en runtime (poner la bandera a mano,
// pasar `integrations: []`, diferir la llamada) saca ese código del bundle: el módulo ya viaja.
//
// Fix real: usar `@sentry/browser` directo en vez de `@sentry/nextjs` para el init del cliente.
// `@sentry/browser` expone cada integración como export nombrado independiente — como este
// archivo nunca importa `browserTracingIntegration`, Turbopack SÍ puede hacer tree-shaking real
// (es un import que simplemente no existe, no uno inhabilitado en runtime). Se pierde el
// enriquecimiento específico de Next.js (normalización de rutas de stack traces de chunks) — es
// un costo aceptable por captura de errores sin tracing. El servidor/edge (`instrumentation.ts`,
// `sentry.server.config.ts`) NO cambian — ese código nunca llega al bundle del cliente.
import {
  init,
  dedupeIntegration,
  inboundFiltersIntegration,
  functionToStringIntegration,
  httpContextIntegration,
  linkedErrorsIntegration,
} from '@sentry/browser';

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
  ],
});
