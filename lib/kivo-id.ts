import crypto from 'node:crypto';

// Código de socio corto y estable, derivado del id del usuario (nunca del correo — así el correo
// no queda expuesto si alguien comparte su tarjeta). Determinístico: mismo usuario, mismo código
// siempre, sin necesidad de guardarlo en una columna aparte.
export function generateMemberCode(userId: string): string {
  const hash = crypto.createHash('sha256').update(userId).digest('hex');
  return `KIVO-${hash.slice(0, 6).toUpperCase()}`;
}
