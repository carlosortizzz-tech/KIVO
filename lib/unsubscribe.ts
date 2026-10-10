import { createHmac, timingSafeEqual } from 'crypto';

// Baja de mensajes de KIVO (feedback, invitaciones, marketing). El enlace va firmado con HMAC para que
// nadie pueda dar de baja a otra persona adivinando su id. La clave se deriva de CRON_SECRET (ya existe
// solo en el servidor); sin ella no se arma ningún enlace y por eso tampoco se envían esos correos.
const BASE_URL = 'https://www.kivoapp.app';

function sign(userId: string): string | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update(`unsubscribe:${userId}`).digest('base64url');
}

export function unsubscribeUrl(userId: string, lang: string): string | null {
  const token = sign(userId);
  if (!token) return null;
  const url = new URL('/api/unsubscribe', BASE_URL);
  url.searchParams.set('u', userId);
  url.searchParams.set('t', token);
  url.searchParams.set('l', lang);
  return url.toString();
}

export function isValidUnsubscribeToken(userId: string, token: string): boolean {
  const expected = sign(userId);
  if (!expected || !token) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
