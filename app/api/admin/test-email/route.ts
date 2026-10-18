import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { sendWelcomeEmail, sendTrialEndingEmail, sendCancellationEmail, sendPaymentFailedEmail, sendGracePeriodEndedEmail, sendFeedbackRequestEmail, sendExperienceInviteEmail } from '@/lib/email';

// Utilidad de admin para probar el copy real de los correos transaccionales sin tener que
// forzar una compra/cancelación real. Mismo guard que "Live ahora" — solo el dueño.
// GET además de POST: así se puede disparar solo con abrir un link en el navegador (logueado
// como admin), sin necesidad de devtools/consola — el dueño de KIVO no es técnico.
// Solo se puede probar hacia las cuentas del proyecto (regla del dueño: nunca correos personales ni de
// terceros). Así, aunque alguien le hiciera abrir un enlace al admin con la sesión iniciada, no podría
// mandar correos desde hola@kivoapp.app a personas ajenas.
const ALLOWED_TEST_RECIPIENTS = new Set(['soporte@kivoapp.app', 'hola@kivoapp.app', 'kivoapp1@gmail.com']);
function isAllowedRecipient(to: string): boolean {
  const t = to.trim().toLowerCase();
  return ALLOWED_TEST_RECIPIENTS.has(t) || /^kivoapp1\+[a-z0-9._-]+@gmail\.com$/.test(t);
}

async function handle(to: string | null, type: string | null, name: string | null) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!to) {
    return NextResponse.json({ error: 'falta "to"' }, { status: 400 });
  }
  if (!isAllowedRecipient(to)) {
    return NextResponse.json({ error: 'destinatario no permitido (solo soporte@, hola@ o kivoapp1@)' }, { status: 403 });
  }

  switch (type) {
    case 'welcome':
      await sendWelcomeEmail(to, 'Fan');
      break;
    case 'trial_ending':
      await sendTrialEndingEmail(to, 'Fan', '4 de septiembre', 2.99, '$');
      break;
    case 'cancellation':
      await sendCancellationEmail(to, 'Fan');
      break;
    case 'payment_failed':
      await sendPaymentFailedEmail(to, 'Fan', new Date(Date.now() + 4 * 86400000).toISOString());
      break;
    case 'grace_period_ended':
      await sendGracePeriodEndedEmail(to, 'Fan');
      break;
    case 'feedback_request':
      await sendFeedbackRequestEmail(to, name);
      break;
    case 'experience_invite':
      await sendExperienceInviteEmail(to, name);
      break;
    default:
      await sendWelcomeEmail(to, 'Fan');
  }

  return NextResponse.json({ ok: true, sent: type || 'welcome', to });
}

export async function POST(req: NextRequest) {
  const { to, type, name } = await req.json().catch(() => ({ to: null, type: null, name: null }));
  return handle(to, type, name ?? null);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return handle(searchParams.get('to'), searchParams.get('type'), searchParams.get('name'));
}
