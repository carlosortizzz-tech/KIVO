// Reglas puras de "¿a dónde va alguien justo después de iniciar sesión?" — compartidas por
// /auth/callback (Google + enlaces PKCE) y /auth/confirm (enlace del correo). Sin dependencias
// de servidor para poder razonarlas y probarlas aisladas.

const KIVO_HOSTS = new Set(['kivoapp.app', 'www.kivoapp.app']);

/**
 * ¿El encabezado Origin de un POST viene de KIVO? Acepta el host de la propia petición y los dos
 * dominios de KIVO (con y sin www), para no depender de cómo Vercel reporte el host. Sin Origin
 * → false (falla cerrado).
 */
export function isKivoOrigin(requestOrigin: string | null, requestUrl: string): boolean {
  if (!requestOrigin) return false;
  let origin: URL;
  try {
    origin = new URL(requestOrigin);
  } catch {
    return false;
  }
  const self = new URL(requestUrl);
  if (origin.host === self.host && origin.protocol === self.protocol) return true;
  return origin.protocol === 'https:' && KIVO_HOSTS.has(origin.host);
}

/**
 * Convierte el `next` que llega por la URL en una ruta interna segura, o null si no sirve.
 * Acepta rutas relativas ("/app") y URLs absolutas de KIVO (la plantilla del correo manda
 * `{{ .RedirectTo }}` completo). Rechaza otros dominios (open redirect), la raíz (es el Site URL
 * de respaldo de Supabase cuando la URL pedida no está permitida — no dice nada del destino real)
 * y /auth/* (evita bucles).
 *
 * `emailRedirectTo` sigue apuntando a /auth/callback para que el enlace funcione con la plantilla
 * vieja (PKCE) y con la nueva (token_hash): con la nueva llega como
 * `next=https://www.kivoapp.app/auth/callback?next=/app`, así que se desenvuelve ese `next` interno.
 */
export function safeNextPath(raw: string | null, origin: string, depth = 0): string | null {
  if (!raw || depth > 1) return null;
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return null;
  }
  const originHost = new URL(origin).host;
  if (url.host !== originHost && !KIVO_HOSTS.has(url.host)) return null;
  if (url.pathname === '/auth/callback') return safeNextPath(url.searchParams.get('next'), origin, depth + 1);
  if (url.pathname === '/' || url.pathname.startsWith('/auth')) return null;
  return url.pathname + url.search;
}

// Toda cuenta que todavía no es Pro pasa UNA vez por el paywall, entre por donde entre: es el caso
// real que rompía el funnel — el enlace de registro fallaba, la persona pedía otro desde /login y
// aterrizaba en /app sin ver nunca el paywall (2026-09-27). Se decide con estado guardado en el
// servidor (profiles.paywall_seen_at), no con la edad de la cuenta: quien vuelve días después
// también cuenta.
export function resolvePostAuthPath({
  requestedPath,
  plan,
  paywallSeenAt,
}: {
  requestedPath: string | null;
  plan: string | null;
  paywallSeenAt: string | null;
}): string {
  if (plan !== 'pro' && !paywallSeenAt) return '/paywall';
  return requestedPath ?? '/app';
}

// `phid` llega por URL o por metadata que el propio cliente escribe — se limita a un formato corto
// y conocido antes de mandarlo a PostHog. (`source` lo valida la función set_profile_source en la
// base de datos.)
export function sanitizePhid(raw: string | null | undefined): string | null {
  return raw && /^[A-Za-z0-9_-]{1,100}$/.test(raw) ? raw : null;
}
