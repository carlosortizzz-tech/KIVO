import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'qxtutijxelikmmplhmgx.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // Links cortos propios para Instagram (reemplazan a TinyURL). Cada uno lleva a la página de
  // inicio con la misma etiqueta de seguimiento que tenía el TinyURL equivalente. Redirección
  // temporal para poder cambiar el destino. Va en la configuración (no en el proxy de idiomas)
  // porque Next la aplica antes de que next-intl toque la ruta.
  async redirects() {
    return [
      { source: '/ig', destination: '/?utm_source=instagram&utm_medium=bio', permanent: false },
      { source: '/guia', destination: '/?utm_source=instagram&utm_medium=manychat_guia', permanent: false },
      { source: '/bts', destination: '/?utm_source=instagram&utm_medium=manychat_bts', permanent: false },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: false,
  disableLogger: true,
  automaticVercelMonitors: false,
  // KIVO solo usa captura de errores (sin tracing ni Session Replay) -- se recorta ese código del
  // bundle del cliente en vez de dejarlo entrar sin usarse (38-PERFORMANCE-BUDGET).
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
    excludeReplayShadowDom: true,
    excludeReplayIframe: true,
    excludeReplayWorker: true,
  },
});
