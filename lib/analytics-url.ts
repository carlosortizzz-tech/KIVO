// Solo estas etiquetas de atribución pueden salir hacia analítica.
const ALLOWED_QUERY_PARAMS = ['utm_source', 'utm_medium', 'src'];
const URL_BASE = 'https://kivoapp.app';

export function cleanAnalyticsUrl(value: string): string {
  if (!/^(?:https?:\/\/|\/)[^\s]*$/i.test(value)) return value;
  try {
    const url = new URL(value, URL_BASE);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    const query = new URLSearchParams();
    for (const key of ALLOWED_QUERY_PARAMS) {
      for (const value of url.searchParams.getAll(key)) query.append(key, value);
    }
    const origin = value.startsWith('/') && !value.startsWith('//') ? '' : url.origin;
    return `${origin}${url.pathname}${query.size ? `?${query}` : ''}`;
  } catch {
    return '';
  }
}

export function cleanAnalyticsText(value: string): string {
  // También limpia direcciones dentro de mensajes y trazas de excepciones.
  const cleaned = value.replace(/https?:\/\/[^\s<>"'`]+|(?<![\w:/])\/[^\s<>"'`]+/gi,
    (url) => cleanAnalyticsUrl(url));
  // Si queda una mención al token fuera de una URL, omite el texto completo.
  return /token_hash|token%5fhash/i.test(cleaned) ? '[redactado]' : cleaned;
}

export function cleanAnalyticsProperties(properties: Record<string, unknown>): void {
  const visited = new WeakSet<object>();
  const clean = (value: unknown): unknown => {
    if (typeof value === 'string') return cleanAnalyticsText(value);
    if (value && typeof value === 'object' && !visited.has(value)) {
      visited.add(value);
      for (const [key, item] of Object.entries(value)) {
        const record = value as Record<string, unknown>;
        if (/token_hash|token%5fhash/i.test(key)) delete record[key];
        else record[key] = clean(item);
      }
    }
    return value;
  };
  clean(properties);
}

export function isSensitiveAnalyticsUrl(value: string): boolean {
  try {
    const { pathname } = new URL(value, URL_BASE);
    return /^\/(?:en\/|fr\/|ko\/)?(?:confirmar\/?$|auth(?:\/|$))/.test(pathname);
  } catch {
    return true;
  }
}
