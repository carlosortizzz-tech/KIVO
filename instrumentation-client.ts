// Carga diferida a propósito (38-PERFORMANCE-BUDGET): el SDK de Sentry pesa ~140KB comprimidos
// incluso solo con captura de errores (sin tracing) — es el tamaño base del paquete, no algo que
// se pueda recortar con configuración. Para que no cuente contra el peso crítico de la primera
// pantalla, se importa después de que la página ya es interactiva, no en el camino síncrono.
function loadSentry() {
  import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    });
  });
}

if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadSentry, { timeout: 4000 });
  } else {
    setTimeout(loadSentry, 2000);
  }
}
