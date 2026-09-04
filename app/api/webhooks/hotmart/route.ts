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
      // Eventos a nivel de SUSCRIPCIÓN (cancelación, cambio de plan) NO traen `data.buyer` --
      // el comprador vive en `data.subscriber` directamente (verificado con la documentación
      // oficial de Hotmart: https://developers.hotmart.com/docs/en/2.0.0/webhook/cancel-subscription-webhook/).
      // Hallazgo real 2026-09-04: las 2 primeras cancelaciones de prueba fallaron con 400
      // "missing buyer email" porque el código solo miraba `data.buyer.email`.
      subscriber?: { code?: string; email?: string; name?: string };
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
  // Eventos de COMPRA (PURCHASE_*) traen el comprador en `data.buyer`; eventos de SUSCRIPCIÓN
  // (SUBSCRIPTION_CANCELLATION, cambio de plan, etc.) lo traen en `data.subscriber` directamente
  // -- se intenta primero buyer (el caso más común) y se cae a subscriber si no está.
  const email = payload.data?.buyer?.email ?? payload.data?.subscriber?.email;
  const name = payload.data?.buyer?.name ?? payload.data?.subscriber?.name ?? '';
  const subscriberCode = payload.data?.subscription?.subscriber?.code ?? payload.data?.subscriber?.code;
  // Best-effort: si Hotmart manda el precio real en el payload, lo guardamos para poder mostrar
  // el monto EXACTO en el aviso pre-cobro del trial (02C) y afinar el MRR del backoffice (21) más
  // adelante — si no viene, queda null y no se inventa un número.
  const priceValue = payload.data?.purchase?.price?.value;
  const priceCurrency = payload.data?.purchase?.price?.currency_value;
  const eventId =
    payload.id ?? payload.event_id ?? payload.data?.purchase?.transaction ?? `${event}:${email}:${ts ?? ''}`;

  const newStatus = statusForEvent(event);
  // Hallazgo real (confirmado con una compra de prueba en producción, 2026-08-27): Hotmart NO
  // manda un evento de trial separado (el placeholder SUBSCRIPTION_TRIAL_START de membership-fsm
  // nunca llegó) — en vez de eso, manda PURCHASE_APPROVED con price.value = 0 (el "cobro
  // simbólico" de validación de tarjeta que Hotmart le muestra al comprador) para el inicio de
  // prueba. La DECISIÓN de si $0 significa "inicio de trial" ahora vive en apply_hotmart_event()
  // (SQL), no acá — porque solo la base de datos sabe si el usuario YA estaba en trialing/active
  // (hallazgo 2026-09-03: tratar CUALQUIER evento $0 como "inicio de trial" sin mirar el estado
  // anterior le reseteaba el reloj de prueba a usuarios que ya habían pagado de verdad la 2ª cuota).
  const priceIsZero = (event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE') && priceValue === 0;
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
    p_price_is_zero: priceIsZero,
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
      p_price_is_zero: priceIsZero,
    });
    if (retryErr) {
      console.error('webhook hotmart error (retry)', { event, code: retryErr.code });
      await admin.from('webhook_log').insert({ event_id: eventId, type: event, result: 'error', detail: `${retryErr.code}: ${retryErr.message}` });
      return NextResponse.json({ error: 'processing failed' }, { status: 500 });
    }
    await admin.from('webhook_log').insert({ event_id: eventId, type: event, result: 'applied' });
    await sendWelcomeEmail(email, name);
    const retryEffectiveStatus: string | undefined = retryData?.new_status;
    if (retryEffectiveStatus === 'active') await trackPlanActualizado(authUser.user.id, 'desconocido');
    if (priceValue) await admin.from('profiles').update({ plan_amount: priceValue, plan_currency: priceCurrency ?? null }).eq('id', authUser.user.id);
    return NextResponse.json({ received: true, result: retryData?.status ?? 'applied' });
  }

  const result = status === 'applied' ? 'applied' : status === 'duplicate' ? 'duplicate' : 'illegal';
  // detail guarda el precio crudo que mandó Hotmart -- hallazgo 2026-09-03: sin esto, cuando un
  // evento llega con price=0 no hay forma de saber después si fue un inicio de prueba legítimo o
  // un cobro real mal reportado (ej. una "cuota" de pago en cuotas), hasta que ya es tarde y los
  // logs de Vercel de esa hora ya expiraron.
  await admin.from('webhook_log').insert({
    event_id: eventId,
    type: event,
    result,
    detail: `price_raw=${priceValue ?? 'undefined'} price_is_zero=${priceIsZero} new_status_mapped=${newStatus} effective_status=${data?.new_status ?? 'n/a'}`,
  });

  // El estado que de verdad quedó guardado lo decide la RPC (data.new_status), no el mapeo crudo
  // del evento (newStatus) — pueden diferir cuando el heurístico $0=trialing se ignora por venir
  // de un usuario que ya estaba en trialing/active/past_due (ver nota arriba).
  const effectiveStatus: string | undefined = status === 'applied' ? data?.new_status : undefined;

  if (status === 'applied') {
    if (effectiveStatus === 'active' || effectiveStatus === 'trialing') {
      await sendWelcomeEmail(email, name);
    } else if (effectiveStatus === 'cancelled') {
      await sendCancellationEmail(email, name);
    } else if (effectiveStatus === 'past_due') {
      const graceEndsAt: string | undefined = data?.grace_period_ends_at;
      if (graceEndsAt) await sendPaymentFailedEmail(email, name, graceEndsAt);
    }
    if (effectiveStatus === 'active' || effectiveStatus === 'trialing') {
      // 'ciclo' (mensual/anual) queda "desconocido": Hotmart no manda el nombre del producto/oferta
      // en este payload — no se inventa el dato, se etiqueta honestamente.
      const { data: profile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
      if (profile?.id) {
        if (effectiveStatus === 'active') await trackPlanActualizado(profile.id, 'desconocido');
        if (priceValue) await admin.from('profiles').update({ plan_amount: priceValue, plan_currency: priceCurrency ?? null }).eq('id', profile.id);
      }
    }
  }

  // 7. Siempre 200 cuando ya se tomó una decisión (incluido duplicate/illegal) para que Hotmart deje de reintentar
  return NextResponse.json({ received: true, result: status });
}
