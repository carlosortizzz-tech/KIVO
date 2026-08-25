import crypto from 'node:crypto';

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Fail-secure evaluado en cada petición (no al cargar el módulo): si falta el secreto en el
// entorno, TODA petición se rechaza como no autorizada — nunca hay un default inseguro.
export function verifyHotmart(opts: { hottok?: string }): boolean {
  const HOTTOK = process.env.HOTMART_HOTTOK;
  if (!HOTTOK) {
    console.error('FALTA HOTMART_HOTTOK — el webhook de Hotmart rechaza toda petición hasta configurarlo');
    return false;
  }
  if (!opts.hottok) return false;
  return timingSafeEqualStr(opts.hottok, HOTTOK);
}
