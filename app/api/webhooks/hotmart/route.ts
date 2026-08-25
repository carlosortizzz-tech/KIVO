import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { verifyHotmart } from '@/lib/hotmart-verify';
import { statusForEvent } from '@/lib/membership-fsm';
import { sendWelcomeEmail, sendCancellationEmail, sendPaymentFailedEmail } from '@/lib/email';

export const runtime = 'nodejs'; // necesita node:crypto y el raw body — no Edge

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role: solo servidor, nunca frontend
    { auth: { persistSession: false } }
  );
}

const REPLAY_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (err) {
    console.error('webhook hotmart: error inesperado', err);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 }); // 5xx → Hotmart reintenta
  }
}

async function handlePost(req: NextRequest) {
  const admin = getAdmin();

  // 1. Raw body — se lee ANTES de parsear (necesario para el hash de auditoría)
  const rawBody = await req.text();

  // 2. Autenticidad — hottok en tiempo constante, sobre HTTPS
  const hottok = req.headers.get('x-hotmart-hottok') ?? undefined;
  if (!verifyHotmart({ hottok })) {
    await admin.from('webhook_log').insert({ result: 'unauthorized' });
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 3. Parsear SOLO después de verificar
  let payload: {
    event?: string;
    id?: string;
    event_id?: string;
    creation_date?: number;
    data?: {
      buyer?: { email?: string; name?: string };
      purchase?: { transaction?: string; approved_date?: number };
      subscription?: { subscriber?: { code?: string } };
    };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  // 4. Frescura (anti-replay)
  const ts = payload.creation_date ?? payload.data?.purchase?.approved_date;
  if (ts && Date.now() - Number(ts) > REPLAY_WINDOW_MS) {
    return NextResponse.json({ error: 'stale' }, { status: 400 });
  }

  // 5. Datos del evento
  const event = payload.event ?? '';
  const email = payload.data?.buyer?.email;
  const name = payload.data?.buyer?.name ?? '';
  const subscriberCode = payload.data?.subscription?.subscriber?.code;
  const eventId =
    payload.id ?? payload.event_id ?? payload.data?.purchase?.transaction ?? `${event}:${email}:${ts ?? ''}`;

  const newStatus = statusForEvent(event);
  if (!newStatus) {
    return NextResponse.json({ received: true, ignored: event });
  }
  if (!email) {
    await admin.from('webhook_log').insert({ event_id: eventId, type: event, result: 'error' });
    return NextResponse.json({ error: 'missing buyer email' }, { status: 400 });
  }

  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  // 6. Idempotencia + transición de estado, todo atómico en la RPC de Postgres
  const { data, error } = await admin.rpc('apply_hotmart_event', {
    p_event_id: eventId,
    p_event_type: event,
    p_payload_hash: payloadHash,
    p_email: email,
    p_name: name,
    p_subscriber_code: subscriberCode ?? null,
    p_new_status: newStatus,
  });

  if (error) {
    console.error('webhook hotmart error', { event, code: error.code }); // sin PII
    await admin.from('webhook_log').insert({ event_id: eventId, type: event, result: 'error' });
    return NextResponse.json({ error: 'processing failed' }, { status: 500 }); // 5xx → Hotmart reintenta
  }

  const status: string = data?.status ?? 'applied';

  // Caso borde: pagó sin haberse registrado antes en KIVO. Se crea la cuenta de auth (dispara
  // el trigger que crea el profile) y se vuelve a aplicar el evento sobre esa cuenta ya real.
  if (status === 'no_profile') {
    const { data: authUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name, source: 'hotmart' },
    });
    if (createErr || !authUser?.user) {
      console.error('webhook hotmart: no se pudo crear la cuenta de auth', { code: createErr?.code });
      await admin.from('webhook_log').insert({ event_id: `${eventId}:retry`, type: event, result: 'error' });
      return NextResponse.json({ error: 'processing failed' }, { status: 500 });
    }
    const { data: retryData, error: retryErr } = await admin.rpc('apply_hotmart_event', {
      p_event_id: `${eventId}:retry`,
      p_event_type: event,
      p_payload_hash: payloadHash,
      p_email: email,
      p_name: name,
      p_subscriber_code: subscriberCode ?? null,
      p_new_status: newStatus,
    });
    if (retryErr) {
      console.error('webhook hotmart error (retry)', { event, code: retryErr.code });
      await admin.from('webhook_log').insert({ event_id: eventId, type: event, result: 'error' });
      return NextResponse.json({ error: 'processing failed' }, { status: 500 });
    }
    await admin.from('webhook_log').insert({ event_id: eventId, type: event, result: 'applied' });
    await sendWelcomeEmail(email, name);
    return NextResponse.json({ received: true, result: retryData?.status ?? 'applied' });
  }

  const result = status === 'applied' ? 'applied' : status === 'duplicate' ? 'duplicate' : 'illegal';
  await admin.from('webhook_log').insert({ event_id: eventId, type: event, result });

  if (status === 'applied') {
    if (newStatus === 'active' || newStatus === 'trialing') {
      await sendWelcomeEmail(email, name);
    } else if (newStatus === 'cancelled') {
      await sendCancellationEmail(email, name);
    } else if (newStatus === 'past_due') {
      await sendPaymentFailedEmail(email, name);
    }
  }

  // 7. Siempre 200 cuando ya se tomó una decisión (incluido duplicate/illegal) para que Hotmart deje de reintentar
  return NextResponse.json({ received: true, result: status });
}
