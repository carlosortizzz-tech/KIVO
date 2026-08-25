import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const FROM = 'KIVO <hola@kivo-app.com>';

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
  const { data } = await getAdmin().auth.admin.generateLink({ type: 'magiclink', email });
  return data?.properties?.action_link || 'https://kivo-topaz.vercel.app/login';
}

// Los 3 emails transaccionales de la venta. Si RESEND_API_KEY todavía no está configurada
// (Resend es un paso pendiente aparte de Hotmart), no tumban el webhook: el pago YA se aplicó
// en la base de datos antes de llegar aquí, solo se pierde el email — se loguea para notarlo.
export async function sendWelcomeEmail(email: string, name: string) {
  const resend = getResend();
  if (!resend) { console.error('RESEND_API_KEY no configurada — no se pudo enviar bienvenida a', email); return; }
  const accessLink = await generateAccessLink(email);
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: '¡Bienvenido/a a KIVO! 🎉 Tu acceso está listo',
    html: `
      <h1>¡Hola ${name}! 👋</h1>
      <p>Tu compra fue confirmada y tu acceso a KIVO ya está activo.</p>
      <p><a href="${accessLink}" style="background:#7C3AED;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Entrar a KIVO →</a></p>
      <p>Este enlace te deja entrar sin contraseña. Si caduca, entra en kivo-topaz.vercel.app/login con este mismo correo.</p>
      <p>¿Dudas? Responde a este email y te ayudamos.</p>
    `,
  });
}

export async function sendCancellationEmail(email: string, name: string) {
  const resend = getResend();
  if (!resend) { console.error('RESEND_API_KEY no configurada — no se pudo enviar cancelación a', email); return; }
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Tu suscripción a KIVO fue cancelada',
    html: `
      <h1>Hola ${name},</h1>
      <p>Confirmamos que tu suscripción a KIVO quedó cancelada. Vas a seguir teniendo acceso hasta el final del período que ya pagaste.</p>
      <p>Si fue un error o cambiaste de opinión, podés volver a activarla cuando quieras desde la app.</p>
      <p>Gracias por haber sido parte de KIVO 💜</p>
    `,
  });
}

export async function sendPaymentFailedEmail(email: string, name: string) {
  const resend = getResend();
  if (!resend) { console.error('RESEND_API_KEY no configurada — no se pudo enviar aviso de pago fallido a', email); return; }
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'No pudimos procesar tu pago de KIVO',
    html: `
      <h1>Hola ${name},</h1>
      <p>Tu último pago no se pudo procesar. Tu acceso sigue activo por unos días mientras lo resolvemos, pero necesitamos que actualices tu método de pago para no perderlo.</p>
      <p><a href="https://kivo-topaz.vercel.app/login" style="background:#7C3AED;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Actualizar método de pago →</a></p>
    `,
  });
}
