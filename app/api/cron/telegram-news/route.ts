import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

// Publica en el canal de Telegram de KIVO las noticias recién cargadas (news_items.kind = 'news').
// Cada noticia se publica UNA sola vez: se marca telegram_posted_at ANTES de enviar (mismo patrón
// de idempotencia que send-feedback-request) y se desmarca si Telegram rechaza el envío.
//
// Solo se publica lo que ya está en la base de datos — nunca se genera contenido aquí. Y falla
// cerrado: sin TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID no se envía nada.
const MAX_PER_RUN = 3; // evita una avalancha si se cargan muchas de golpe
const MAX_AGE_MS = 48 * 3600_000; // no publica noticias viejas que hubieran quedado sin marcar
const SUMMARY_MAX = 900;
const KIVO_URL = 'https://www.kivoapp.app/?utm_source=telegram&utm_medium=news';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function safeHttpUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!cronSecret || !auth || !safeEqual(auth, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return NextResponse.json({ ok: false, error: 'telegram not configured' }, { status: 503 });
  }
  const silent = process.env.TELEGRAM_SILENT === '1';

  const admin = getAdmin();
  const since = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const { data: items, error } = await admin
    .from('news_items')
    .select('id, headline, summary, source_url, source_name')
    .eq('kind', 'news')
    .is('telegram_posted_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) {
    console.error('telegram-news: no se pudieron leer las noticias', error.message);
    return NextResponse.json({ ok: false, error: 'db error' }, { status: 500 });
  }

  let sent = 0;
  for (const item of items ?? []) {
    // Reclama la noticia antes de enviar: si dos ejecuciones se cruzan, solo una la publica.
    const { data: claimed } = await admin
      .from('news_items')
      .update({ telegram_posted_at: new Date().toISOString() })
      .eq('id', item.id)
      .is('telegram_posted_at', null)
      .select('id');
    if (!claimed || claimed.length === 0) continue;

    const summary = item.summary.length > SUMMARY_MAX ? `${item.summary.slice(0, SUMMARY_MAX).trimEnd()}…` : item.summary;
    const sourceUrl = safeHttpUrl(item.source_url);
    const sourceLine = sourceUrl
      ? `Fuente: <a href="${escapeHtml(sourceUrl)}">${escapeHtml(item.source_name ?? sourceUrl)}</a>`
      : item.source_name
        ? `Fuente: ${escapeHtml(item.source_name)}`
        : '';
    const text = [
      `📰 <b>${escapeHtml(item.headline)}</b>`,
      escapeHtml(summary),
      sourceLine,
      `👉 Más en KIVO: ${KIVO_URL}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    // El token va en la URL de la API de Telegram: nunca se registra la URL, solo el resultado.
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_notification: silent }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;

    if (!res || !res.ok || !body?.ok) {
      // Se desmarca para reintentar en la próxima ejecución, y se corta aquí para no insistir.
      await admin.from('news_items').update({ telegram_posted_at: null }).eq('id', item.id);
      const detail = `status=${res?.status ?? 'sin respuesta'} ${body?.description ?? ''}`.trim();
      console.error('telegram-news: Telegram rechazó el envío', detail);
      await admin.from('webhook_log').insert({ type: 'telegram:news', result: 'error', detail });
      return NextResponse.json({ ok: false, sent, error: 'telegram rejected' }, { status: 502 });
    }
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
