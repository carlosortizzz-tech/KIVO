import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { sendWelcomeEmail, sendTrialEndingEmail, sendCancellationEmail, sendPaymentFailedEmail } from '@/lib/email';

// Utilidad de admin para probar el copy real de los correos transaccionales sin tener que
// forzar una compra/cancelación real. Mismo guard que "Live ahora" — solo el dueño.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { to, type } = await req.json().catch(() => ({}));
  if (!to || typeof to !== 'string') {
    return NextResponse.json({ error: 'falta "to"' }, { status: 400 });
  }

  switch (type) {
    case 'welcome':
      await sendWelcomeEmail(to, 'ARMY');
      break;
    case 'trial_ending':
      await sendTrialEndingEmail(to, 'ARMY', '4 de septiembre', 2.99, '$');
      break;
    case 'cancellation':
      await sendCancellationEmail(to, 'ARMY');
      break;
    case 'payment_failed':
      await sendPaymentFailedEmail(to, 'ARMY');
      break;
    default:
      await sendWelcomeEmail(to, 'ARMY');
  }

  return NextResponse.json({ ok: true, sent: type || 'welcome', to });
}
