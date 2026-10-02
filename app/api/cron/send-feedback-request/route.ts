import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendFeedbackRequestEmail } from '@/lib/email';

export const runtime = 'nodejs';

// Correo de feedback a los 8 días de registro (pedido del dueño, 2026-10-01): una sola vez por
// usuario, controlado con profiles.feedback_requested_at — mismo patrón de idempotencia que el
// aviso del trial en send-reminders (marcar ANTES de mandar, no después).
const DAYS_AFTER_SIGNUP = 8;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!cronSecret || !auth || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = getAdmin();
  const cutoff = new Date(Date.now() - DAYS_AFTER_SIGNUP * 86400_000).toISOString();

  const { data: users } = await admin
    .from('profiles')
    .select('id, email, display_name')
    .is('feedback_requested_at', null)
    .lte('created_at', cutoff)
    .not('email', 'is', null);

  let sent = 0;
  let skipped = 0;

  for (const user of users ?? []) {
    if (!user.email) continue;
    const { error: markErr } = await admin
      .from('profiles')
      .update({ feedback_requested_at: new Date().toISOString() })
      .eq('id', user.id)
      .is('feedback_requested_at', null);
    if (markErr) { skipped++; continue; }

    // Nombre real solo si Google lo dio (tiene espacio) — si no, saludo genérico en vez del
    // prefijo del correo como nombre (se vería robótico, ej. "Hola waleskat248").
    const name = user.display_name?.includes(' ') ? user.display_name.split(' ')[0] : null;
    await sendFeedbackRequestEmail(user.email, name);
    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
