import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Política de contenido (CSP) en modo SOLO REPORTAR: el navegador anota en consola lo que bloquearía,
// pero no bloquea nada. Se pasa a modo estricto cuando una revisión de las pantallas reales no
// muestre violaciones. Los servicios de la lista son los que la app usa hoy (Supabase, PostHog,
// Sentry, Hotmart, Instagram, YouTube, Spotify, Google). 'unsafe-inline' hace falta mientras Next
// inyecte scripts/estilos en línea sin nonce.
const SUPABASE_HOST = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://invalid.supabase.co').host;
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.hotmart.com https://*.hotmart.com https://www.instagram.com https://us-assets.i.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: https://i.ytimg.com https://i.scdn.co https://${SUPABASE_HOST} https://lh3.googleusercontent.com https://*.cdninstagram.com https://*.fbcdn.net https://*.hotmart.com https://upload.wikimedia.org`,
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.hotmart.com`,
  "frame-src https://www.instagram.com https://*.hotmart.com https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "report-uri /api/csp-report",
].join('; ');

const nextConfig: NextConfig = {
  // No anunciar la tecnología ("x-powered-by: Next.js") a quien escanea el sitio.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Nadie puede incrustar KIVO en otra web (clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
        ],
      },
    ];
  },
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
      { source: '/yt', destination: '/?utm_source=youtube&utm_medium=bio', permanent: false },
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
