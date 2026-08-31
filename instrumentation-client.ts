import * as Sentry from '@sentry/nextjs';

// Sin tracing/replay a propósito (38-PERFORMANCE-BUDGET): KIVO solo necesita captura de errores.
// Se intentó diferir la carga de 3 formas distintas (requestIdleCallback acá, opciones de recorte
// de Sentry, un componente cliente aparte) y ninguna evitó que Next.js/Turbopack lo incluyera en
// el chunk inicial de la página — es una limitación real de la herramienta hoy (2026-08-30), no
// una configuración faltante. Se acepta el peso (~140KB comprimidos) del SDK como el costo real
// de tener monitoreo de errores en producción, documentado en ESTADO.md.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
});
