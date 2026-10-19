import crypto from 'node:crypto';

// Valida un "Authorization: Bearer <secreto>" comparando en tiempo constante (no se puede ir adivinando
// el secreto por cuánto tarda en responder) y falla cerrado: sin secreto configurado, nada se autoriza.
export function isValidBearer(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret || !authHeader) return false;
  const given = Buffer.from(authHeader, 'utf8');
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
