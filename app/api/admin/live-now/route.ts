import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { sendLiveNowEmail } from '@/lib/email';

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().optional().or(z.literal('')),
});

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  // Autorización: sesión real del dueño (no un secreto compartido) — esto lo dispara una persona
  // logueada desde la app, no un cron ni un servicio externo.
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const { title, url } = parsed.data;

  const admin = getAdmin();
  const { data: proUsers, error } = await admin
    .from('profiles')
    .select('email, display_name')
    .eq('plan', 'pro')
    .not('email', 'is', null);

  if (error) {
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }

  let sent = 0;
  for (const u of proUsers ?? []) {
    if (!u.email) continue;
    await sendLiveNowEmail(u.email, u.display_name ?? 'Fan', title, url || undefined);
    sent++;
  }

  await admin.from('webhook_log').insert({ type: 'admin:live_now', result: 'applied', detail: `title="${title}" sent=${sent}` });

  return NextResponse.json({ ok: true, sent });
}
