import * as Sentry from '@sentry/nextjs';

// Sin tracesSampleRate a propósito: solo queremos captura de errores, no tracing de rendimiento
// (38-PERFORMANCE-BUDGET) — con tracing activo, Sentry agrega ~150KB comprimidos al bundle del
// cliente por el browserTracingIntegration automático. Sin él, el SDK de errores pesa ~15-20KB.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
