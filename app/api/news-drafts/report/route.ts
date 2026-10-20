import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidBearer } from '@/lib/bearer-auth';

export const runtime = 'nodejs';

// Reporte diario de la tarea automática de noticias: lo reenvía por Telegram (mensaje privado) a los
// administradores, y lo deja anotado en webhook_log. Usa la misma clave que la entrada de borradores
// (NEWS_INGEST_SECRET). No lee nada de la base de datos: solo cuenta cuántos reportes hubo hoy.
//
// Falla cerrado: sin NEWS_INGEST_SECRET responde 503; sin token/chat de Telegram no envía nada.
const STATUSES: Record<string, string> = {
  enviado: '✅',
  sin_novedades: 'ℹ️',
  sin_archivo: '⚠️',
  error: '❌',
};
const MAX_BODY = 4096;
const MAX_PER_DAY = 12;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function POST(req: NextRequest) {
  if (!process.env.NEWS_INGEST_SECRET) return fail(503, 'not configured');
  if (!isValidBearer(req.headers.get('authorization'), process.env.NEWS_INGEST_SECRET)) return fail(401, 'unauthorized');

  const raw = await req.text().catch(() => '');
  if (!raw || raw.length > MAX_BODY) return fail(413, 'body too large or empty');
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, 'invalid json');
  }
  const status = String(body?.status ?? '');
  const summary = typeof body?.summary === 'string' ? body.summary.trim() : '';
  if (!(status in STATUSES)) return fail(400, `status must be one of: ${Object.keys(STATUSES).join(', ')}`);
  if (summary.length < 1 || summary.length > 600) return fail(400, 'summary must be 1-600 characters');

  const admin = getAdmin();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from('webhook_log').select('id', { count: 'exact', head: true }).eq('type', 'news:report').gte('received_at', since);
  if ((count ?? 0) >= MAX_PER_DAY) return fail(429, 'daily limit reached');

  await admin.from('webhook_log').insert({ type: 'news:report', result: 'applied', detail: `${status} | ${summary.slice(0, 200)}` });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '').split(',').map((id) => id.trim()).filter((id) => /^-?\d+$/.test(id));
  if (!token || chatIds.length === 0) return NextResponse.json({ ok: true, delivered: 0 });

  const text = `${STATUSES[status]} <b>Noticias automáticas</b>\n\n${escapeHtml(summary)}`;
  let delivered = 0;
  for (const chatId of chatIds) {
    // El token va en la URL de la API de Telegram: nunca se registra la URL, solo el resultado.
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (res && res.ok && data?.ok) delivered++;
    else await admin.from('webhook_log').insert({ type: 'telegram:drafts', result: 'error', detail: `report status=${res?.status ?? 'sin respuesta'} ${data?.description ?? ''}`.trim() });
  }
  return NextResponse.json({ ok: true, delivered });
}
