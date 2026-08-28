import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { PostHog } from 'posthog-node';
import { verifyHotmart } from '@/lib/hotmart-verify';
import { statusForEvent } from '@/lib/membership-fsm';
import { sendWelcomeEmail, sendCancellationEmail, sendPaymentFailedEmail } from '@/lib/email';

export const runtime = 'nodejs'; // necesita node:crypto y el raw body — no Edge

// flushAt:1 + flushInterval:0 → cada capture se envía de inmediato (ver 36-ANALITICA-Y-EVENTOS).
// El pago NO puede depender del navegador (adblockers) — se captura acá, server-side.
const ph = process.env.POSTHOG_KEY
  ? new PostHog(process.env.POSTHOG_KEY, { host: process.env.POSTHOG_HOST, flushAt: 1, flushInterval: 0 })
  : null;

async function trackPlanActualizado(userId: string, ciclo: string) {
  if (!ph) return;
  ph.capture({ distinctId: userId, event: 'plan_actualizado', properties: { plan: 'pro', ciclo, capturado: 'server' } });
  await ph.flush();
}

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
    // El detalle queda en webhook_log (además de los logs de la plataforma) para poder
    // diagnosticar sin depender de acceso a los logs del hosting.
    try {
      await getAdmin()
        .from('webhook_log')
        .insert({ result: 'error', detail: err instanceof Error ? `${err.message}\n${err.stack}` : String(err) });
    } catch {}
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
      purchase?: { transaction?: string; approved_date?: number; price?: { value?: number; currency_value?: string } };
      subscription?: { subscriber?: { code?: string } };
    };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  // 4. Frescura (anti-replay) — Hotmart puede mandar el timestamp en segundos o en milisegundos
  // según el campo/cuenta; si el número es demasiado chico para ser milisegundos (fecha antes de
  // 2001), se asume que son segundos y se convierte.
  const rawTs = payload.creation_date ?? payload.data?.purchase?.approved_date;
  const ts = rawTs && Number(rawTs) < 1e12 ? Number(rawTs) * 1000 : rawTs ? Number(rawTs) : undefined;
  if (ts && Date.now() - ts > REPLAY_WINDOW_MS) {
    await admin.from('webhook_log').insert({
      event_id: payload.id ?? payload.event_id ?? null,
      type: payload.event ?? '(sin tipo)',
      result: 'error',
      detail: `stale: raw_ts=${rawTs} normalized_ts=${ts} now=${Date.now()} diff_ms=${Date.now() - ts}`,
    });
    return NextResponse.json({ error: 'stale' }, { status: 400 });
  }

  // 5. Datos del evento
  const event = payload.event ?? '';
  const email = payload.data?.buyer?.email;
  const name = payload.data?.buyer?.name ?? '';
  const subscriberCode = payload.data?.subscription?.subscriber?.code;
  // Best-effort: si Hotmart manda el precio real en el payload, lo guardamos para poder mostrar
  // el monto EXACTO en el aviso pre-cobro del trial (02C) y afinar el MRR del backoffice (21) más
  // adelante — si no viene, queda null y no se inventa un número.
  const priceValue = payload.data?.purchase?.price?.value;
  const priceCurrency = payload.data?.purchase?.price?.currency_value;
  const eventId =
    payload.id ?? payload.event_id ?? payload.data?.purchase?.transaction ?? `${event}:${email}:${ts ?? ''}`;

  let newStatus = statusForEvent(event);
  // Hallazgo real (confirmado con una compra de prueba en producción, 2026-08-27): Hotmart NO
  // manda un evento de trial separado (el placeholder SUBSCRIPTION_TRIAL_START de membership-fsm
  // nunca llegó) — en vez de eso, manda PURCHASE_APPROVED con price.value = 0 (el "cobro
  // simbólico" de validación de tarjeta que Hotmart le muestra al comprador). Sin este ajuste,
  // CADA trial resolvía directo a 'active' con trial_ends_at vacío, y el puente del trial (correo
  // D6 + indicador "Día X de 7") nunca se disparaba para nadie. $0 en un PURCHASE_APPROVED/
  // COMPLETE = inicio de trial, no cobro real.
  if ((event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE') && priceValue === 0) {
    newStatus = 'trialing';
  }
  if (!newStatus) {
    // Se registra igual (con el event_id crudo del payload, sin pasar por la RPC) para que
    // el backoffice VEA que Hotmart mandó algo, aunque sea un tipo de evento que no manejamos
    // (por ejemplo la prueba de configuración del panel) — si no, la prueba "desaparece" sin rastro.
    await admin.from('webhook_log').insert({
      event_id: payload.id ?? payload.event_id ?? null,
      type: event || '(sin tipo)',
      result: 'ignored',
    });
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
    await admin.from('webhook_log').insert({ event_id: eventId, type: event, result: 'error', detail: `${error.code}: ${error.message}` });
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
      await admin.from('webhook_log').insert({ event_id: `${eventId}:retry`, type: event, result: 'error', detail: createErr?.message ?? 'createUser sin usuario' });
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
      await admin.from('webhook_log').insert({ event_id: eventId, type: event, result: 'error', detail: `${retryErr.code}: ${retryErr.message}` });
      return NextResponse.json({ error: 'processing failed' }, { status: 500 });
    }
    await admin.from('webhook_log').insert({ event_id: eventId, type: event, result: 'applied' });
    await sendWelcomeEmail(email, name);
    if (newStatus === 'active') await trackPlanActualizado(authUser.user.id, 'desconocido');
    if (priceValue) await admin.from('profiles').update({ plan_amount: priceValue, plan_currency: priceCurrency ?? null }).eq('id', authUser.user.id);
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
    if (newStatus === 'active' || newStatus === 'trialing') {
      // 'ciclo' (mensual/anual) queda "desconocido": Hotmart no manda el nombre del producto/oferta
      // en este payload — no se inventa el dato, se etiqueta honestamente.
      const { data: profile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
      if (profile?.id) {
        if (newStatus === 'active') await trackPlanActualizado(profile.id, 'desconocido');
        if (priceValue) await admin.from('profiles').update({ plan_amount: priceValue, plan_currency: priceCurrency ?? null }).eq('id', profile.id);
      }
    }
  }

  // 7. Siempre 200 cuando ya se tomó una decisión (incluido duplicate/illegal) para que Hotmart deje de reintentar
  return NextResponse.json({ received: true, result: status });
}
