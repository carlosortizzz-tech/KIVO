import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEventReminderEmail } from '@/lib/email';

export const runtime = 'nodejs';

// Ventanas de aviso, con margen (el cron corre cada 15 min, no puede acertar el minuto exacto).
const WINDOWS: { key: '48h' | '1h'; fromMs: number; toMs: number }[] = [
  { key: '48h', fromMs: 47.75 * 3600_000, toMs: 48.25 * 3600_000 },
  { key: '1h', fromMs: 0.75 * 3600_000, toMs: 1.25 * 3600_000 },
];

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

        await sendEventReminderEmail(user.email, user.display_name ?? 'ARMY', event.title, w.key);
        sent++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
