'use client';

import { useEffect } from 'react';

// Componente sin UI: carga el SDK de Sentry como un chunk aparte, después de que la página ya es
// interactiva, para que no cuente contra el peso crítico de la primera pantalla
// (38-PERFORMANCE-BUDGET). Ver nota en instrumentation-client.ts sobre por qué no se inicializa
// ahí directamente.
export function SentryInit() {
  useEffect(() => {
    function load() {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.init({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
        });
      });
    }
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(load, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(load, 2000);
    return () => clearTimeout(id);
  }, []);

  return null;
}
