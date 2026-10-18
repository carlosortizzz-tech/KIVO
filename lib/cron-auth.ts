import crypto from 'node:crypto';

// Valida el "Authorization: Bearer <CRON_SECRET>" que mandan los procesos automáticos (pg_cron).
// Compara en tiempo constante (no se puede ir adivinando el secreto por cuánto tarda en responder)
// y falla cerrado: sin CRON_SECRET en el entorno, nada se autoriza.
export function isValidCronAuth(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  const given = Buffer.from(authHeader, 'utf8');
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
