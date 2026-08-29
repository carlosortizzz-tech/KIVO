import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEventReminderEmail, sendTrialEndingEmail } from '@/lib/email';

export const runtime = 'nodejs';

// Ventanas de aviso, con margen (el cron corre cada 15 min, no puede acertar el minuto exacto).
const WINDOWS: { key: '48h' | '1h'; fromMs: number; toMs: number }[] = [
  { key: '48h', fromMs: 47.75 * 3600_000, toMs: 48.25 * 3600_000 },
  { key: '1h', fromMs: 0.75 * 3600_000, toMs: 1.25 * 3600_000 },
];

// D6 del puente del trial (02C): aviso pre-cobro ~24h antes de que termine la prueba gratis.
const TRIAL_WARNING_FROM_MS = 23.75 * 3600_000;
const TRIAL_WARNING_TO_MS = 24.25 * 3600_000;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  // Vercel Cron manda automáticamente "Authorization: Bearer <CRON_SECRET>" cuando la env var
  // CRON_SECRET existe en el proyecto — así se verifica que la llamada viene del cron, no de un tercero.
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!cronSecret || !auth || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = getAdmin();
  const now = Date.now();
  let sent = 0;
  let skipped = 0;

  for (const w of WINDOWS) {
    const from = new Date(now + w.fromMs).toISOString();
    const to = new Date(now + w.toMs).toISOString();

    const { data: events, error: eventsErr } = await admin
      .from('events')
      .select('id, title')
      .gte('starts_at', from)
      .lte('starts_at', to);

    if (eventsErr || !events?.length) continue;

    for (const event of events) {
      // Solo usuarios Pro reciben avisos proactivos — coherente con el gating de Guide/Community/Safe.
      const { data: proUsers } = await admin
        .from('profiles')
        .select('id, email, display_name')
        .eq('plan', 'pro')
        .not('email', 'is', null);

      for (const user of proUsers ?? []) {
        if (!user.email) continue;
        // Idempotencia: el insert falla si ya se mandó este evento+usuario+ventana (unique constraint).
        const { error: dupErr } = await admin
          .from('event_notifications')
          .insert({ event_id: event.id, user_id: user.id, notif_window: w.key });
        if (dupErr) { skipped++; continue; }

        await sendEventReminderEmail(user.email, user.display_name ?? 'Fan', event.title, w.key);
        sent++;
      }
    }
  }

  // Aviso pre-cobro del trial (D6) — una sola vez por usuario, controlado con trial_warning_sent_at.
  const trialFrom = new Date(now + TRIAL_WARNING_FROM_MS).toISOString();
  const trialTo = new Date(now + TRIAL_WARNING_TO_MS).toISOString();
  const { data: trialUsers } = await admin
    .from('profiles')
    .select('id, email, display_name, trial_ends_at, plan_amount, plan_currency')
    .eq('status', 'trialing')
    .is('trial_warning_sent_at', null)
    .gte('trial_ends_at', trialFrom)
    .lte('trial_ends_at', trialTo)
    .not('email', 'is', null);

  for (const user of trialUsers ?? []) {
    if (!user.email || !user.trial_ends_at) continue;
    // Marcar ANTES de mandar (no después): si el envío falla a mitad de camino, preferimos
    // saltarnos un aviso a mandarlo duplicado — coherente con el resto del cron (idempotencia primero).
    const { error: markErr } = await admin
      .from('profiles')
      .update({ trial_warning_sent_at: new Date().toISOString() })
      .eq('id', user.id)
      .is('trial_warning_sent_at', null);
    if (markErr) { skipped++; continue; }

    const chargeDateLabel = new Date(user.trial_ends_at).toLocaleDateString('es', { day: 'numeric', month: 'long' });
    await sendTrialEndingEmail(user.email, user.display_name ?? 'Fan', chargeDateLabel, user.plan_amount, user.plan_currency);
    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
