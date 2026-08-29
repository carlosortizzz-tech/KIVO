import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { sendWelcomeEmail, sendTrialEndingEmail, sendCancellationEmail, sendPaymentFailedEmail } from '@/lib/email';

// Utilidad de admin para probar el copy real de los correos transaccionales sin tener que
// forzar una compra/cancelación real. Mismo guard que "Live ahora" — solo el dueño.
// GET además de POST: así se puede disparar solo con abrir un link en el navegador (logueado
// como admin), sin necesidad de devtools/consola — el dueño de KIVO no es técnico.
async function handle(to: string | null, type: string | null) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!to) {
    return NextResponse.json({ error: 'falta "to"' }, { status: 400 });
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
      await sendPaymentFailedEmail(to, 'Fan');
      break;
    default:
      await sendWelcomeEmail(to, 'Fan');
  }

  return NextResponse.json({ ok: true, sent: type || 'welcome', to });
}

export async function POST(req: NextRequest) {
  const { to, type } = await req.json().catch(() => ({ to: null, type: null }));
  return handle(to, type);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return handle(searchParams.get('to'), searchParams.get('type'));
}
