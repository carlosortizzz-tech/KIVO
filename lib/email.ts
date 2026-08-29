import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const FROM = 'KIVO <hola@kivoapp.app>';
const APP_URL = 'https://kivoapp.app';

function getResend(): Resend | null {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function generateAccessLink(email: string): Promise<string> {
  // Sin options.redirectTo, Supabase manda al usuario al Site URL configurado (kivoapp.app raíz)
  // con un ?code= que NADIE consume ahí — la sesión nunca se crea porque exchangeCodeForSession
  // solo se llama en /auth/callback. Bug real encontrado en producción (2026-08-28): el usuario
  // reportó que el link del correo lo devolvía al login. Con redirectTo explícito al callback,
  // el intercambio de sesión sí ocurre.
  const { data } = await getAdmin().auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${APP_URL}/auth/callback` },
  });
  return data?.properties?.action_link || `${APP_URL}/login`;
}

// Los 3 emails transaccionales de la venta. Si RESEND_API_KEY todavía no está configurada, o si
// Resend rechaza el envío, no tumban el webhook: el pago YA se aplicó en la base de datos antes
// de llegar aquí — solo se pierde el email, y se deja rastro en webhook_log para notarlo.
export async function sendWelcomeEmail(email: string, name: string) {
  const resend = getResend();
  if (!resend) { await logEmailFailure('welcome', email, 'RESEND_API_KEY no configurada'); return; }
  const accessLink = await generateAccessLink(email);
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: '💜 Bienvenido a KIVO: la comunidad de BTS comienza aquí',
    html: emailShell(`
      <h1>💜 Bienvenido a KIVO: la comunidad de BTS comienza aquí</h1>
      <p>Desde hoy tienes un nuevo espacio para vivir tu pasión por BTS de una forma más fácil, organizada y sin perderte nada.</p>
      <p>En KIVO vas a encontrar tu calendario de preventas y comebacks, guías paso a paso para formar parte de una comunidad de fans de BTS sin spam.</p>
      <p>Tu Radar ya está listo.</p>
      <p><a href="${accessLink}" style="background:#7C3AED;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Ingresa a KIVO →</a></p>
      <p>Entra, revisa tu próximo evento y explora todo lo que ya armamos para ti.</p>
      <p><b>Menos tiempo buscando. Más tiempo disfrutando.</b></p>
      <p>Nos alegra tenerte con nosotros. 💜</p>
      <p><b>Equipo KIVO</b><br><i>Nunca más te pierdas una preventa de BTS.</i></p>
      <p style="font-size:12px;color:#666">Este enlace te deja entrar sin contraseña. Si caduca, entra en kivoapp.app/login con este mismo correo. ¿Dudas? Responde a este email y te ayudamos.</p>
    `),
  });
  if (error) await logEmailFailure('welcome', email, `${error.name}: ${error.message}`);
}

export async function sendCancellationEmail(email: string, name: string) {
  const resend = getResend();
  if (!resend) { await logEmailFailure('cancellation', email, 'RESEND_API_KEY no configurada'); return; }
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Tu suscripción a KIVO fue cancelada',
    html: emailShell(`
      <h1>Hola ${name},</h1>
      <p>Confirmamos que tu suscripción a KIVO quedó cancelada. Vas a seguir teniendo acceso hasta el final del período que ya pagaste.</p>
      <p>Si fue un error o cambiaste de opinión, podés volver a activarla cuando quieras desde la app.</p>
      <p>Gracias por haber sido parte de KIVO 💜</p>
    `),
  });
  if (error) await logEmailFailure('cancellation', email, `${error.name}: ${error.message}`);
}

export async function sendPaymentFailedEmail(email: string, name: string) {
  const resend = getResend();
  if (!resend) { await logEmailFailure('payment_failed', email, 'RESEND_API_KEY no configurada'); return; }
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'No pudimos procesar tu pago de KIVO',
    html: emailShell(`
      <h1>Hola ${name},</h1>
      <p>Tu último pago no se pudo procesar. Tu acceso sigue activo por unos días mientras lo resolvemos, pero necesitamos que actualices tu método de pago para no perderlo.</p>
      <p><a href="${APP_URL}/login" style="background:#7C3AED;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Actualizar método de pago →</a></p>
    `),
  });
  if (error) await logEmailFailure('payment_failed', email, `${error.name}: ${error.message}`);
}

export async function sendTrialEndingEmail(
  email: string,
  name: string,
  chargeDateLabel: string,
  amount: number | null,
  currency: string | null
) {
  const resend = getResend();
  if (!resend) { await logEmailFailure('trial_ending', email, 'RESEND_API_KEY no configurada'); return; }
  const accessLink = await generateAccessLink(email);
  // Monto exacto SOLO si lo tenemos real (ver 02C: "aviso pre-cobro honesto, monto exacto") — si
  // Hotmart no nos lo mandó, no se inventa un número; se dice la fecha igual, que sí es exacta.
  const amountLine = amount
    ? `Se te cobrará <b>${currency ?? '$'}${amount}</b> el <b>${chargeDateLabel}</b>.`
    : `Tu primer cobro es el <b>${chargeDateLabel}</b>.`;
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Tu prueba gratis de KIVO termina mañana',
    html: emailShell(`
      <h1>Hola ${name}, tu prueba termina mañana 👋</h1>
      <p>${amountLine}</p>
      <p>Si quieres seguir con KIVO Pro, no tienes que hacer nada — tu acceso continúa automático, sin cortes.</p>
      <p>Si prefieres no continuar, puedes cancelar en un toque antes de esa fecha, sin vueltas:</p>
      <p><a href="${APP_URL}/app/cuenta/cancelar" style="background:#7C3AED;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Cancelar mi prueba →</a></p>
      <p>O <a href="${accessLink}">entra a KIVO</a> para ver todo lo que ya desbloqueaste.</p>
    `),
  });
  if (error) await logEmailFailure('trial_ending', email, `${error.name}: ${error.message}`);
}

export async function sendEventReminderEmail(
  email: string,
  name: string,
  eventTitle: string,
  notifWindow: '48h' | '1h'
) {
  const resend = getResend();
  if (!resend) { await logEmailFailure('reminder', email, 'RESEND_API_KEY no configurada'); return; }
  const accessLink = await generateAccessLink(email);
  const whenLabel = notifWindow === '48h' ? 'en 2 días' : 'en 1 hora';
  const subject = notifWindow === '48h'
    ? `⏰ ${eventTitle} empieza en 2 días`
    : `🚨 ${eventTitle} empieza en 1 hora`;
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html: emailShell(`
      <h1>¡Hola ${name}! 👋</h1>
      <p><b>${eventTitle}</b> empieza ${whenLabel} — este es tu aviso de KIVO Radar para que no te agarre desprevenido.</p>
      <p><a href="${accessLink}" style="background:#7C3AED;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Ver la guía en KIVO →</a></p>
      <p>Este enlace te deja entrar sin contraseña.</p>
    `),
  });
  if (error) await logEmailFailure('reminder', email, `${error.name}: ${error.message}`);
}

export async function sendLiveNowEmail(email: string, name: string, title: string, url?: string) {
  const resend = getResend();
  if (!resend) { await logEmailFailure('live_now', email, 'RESEND_API_KEY no configurada'); return; }
  const accessLink = await generateAccessLink(email);
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `🔴 EN VIVO AHORA: ${title}`,
    html: emailShell(`
      <h1>¡${name}, es ahora! 🔴</h1>
      <p><b>${title}</b> está en vivo en este momento.</p>
      ${url ? `<p><a href="${url}" style="background:#7C3AED;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Ver el live →</a></p>` : ''}
      <p><a href="${accessLink}">O entra a KIVO</a> para más contexto.</p>
    `),
  });
  if (error) await logEmailFailure('live_now', email, `${error.name}: ${error.message}`);
}

function emailShell(bodyHtml: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body style="font-family:sans-serif;color:#111">${bodyHtml}</body></html>`;
}

async function logEmailFailure(kind: string, email: string, detail: string) {
  console.error(`webhook hotmart: no se pudo enviar email "${kind}"`, { detail });
  try {
    await getAdmin().from('webhook_log').insert({ type: `email:${kind}`, result: 'error', detail });
  } catch {}
}
