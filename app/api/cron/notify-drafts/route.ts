import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidCronAuth } from '@/lib/cron-auth';

export const runtime = 'nodejs';

// Avisa por Telegram (mensaje privado, no el canal público) a los administradores cuando hay noticias
// esperando su aprobación en news_drafts. Cada borrador se avisa UNA sola vez: se marca notified_at
// ANTES de enviar (mismo patrón de idempotencia que telegram-news) y se desmarca si Telegram falla.
//
// Falla cerrado: sin TELEGRAM_BOT_TOKEN y TELEGRAM_ADMIN_CHAT_IDS (ids separados por coma) no envía nada.
const ADMIN_URL = 'https://www.kivoapp.app/app/admin/noticias';
const MAX_LISTED = 5;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET(req: NextRequest) {
  if (!isValidCronAuth(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^-?\d+$/.test(id));
  if (!token || chatIds.length === 0) {
    return NextResponse.json({ ok: false, error: 'telegram admin not configured' }, { status: 503 });
  }

  const admin = getAdmin();

  // Reclama los borradores pendientes que todavía no se avisaron: si dos ejecuciones se cruzan, solo una los avisa.
  const { data: claimed, error } = await admin
    .from('news_drafts')
    .update({ notified_at: new Date().toISOString() })
    .eq('status', 'pending')
    .is('notified_at', null)
    .select('id, headline, created_at');
  if (error) {
    console.error('notify-drafts: no se pudieron leer los borradores', error.message);
    return NextResponse.json({ ok: false, error: 'db error' }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) return NextResponse.json({ ok: true, notified: 0 });
  claimed.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const listed = claimed.slice(0, MAX_LISTED).map((d) => `• ${escapeHtml(d.headline)}`);
  const more = claimed.length > MAX_LISTED ? `\n…y ${claimed.length - MAX_LISTED} más` : '';
  const title = claimed.length === 1 ? '📰 1 noticia espera tu aprobación' : `📰 ${claimed.length} noticias esperan tu aprobación`;
  const text = `<b>${title}</b>\n\n${listed.join('\n')}${more}\n\n👉 ${ADMIN_URL}`;

  let delivered = 0;
  for (const chatId of chatIds) {
    // El token va en la URL de la API de Telegram: nunca se registra la URL, solo el resultado.
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    if (res && res.ok && body?.ok) {
      delivered++;
    } else {
      const detail = `status=${res?.status ?? 'sin respuesta'} ${body?.description ?? ''}`.trim();
      console.error('notify-drafts: Telegram rechazó el envío', detail);
      await admin.from('webhook_log').insert({ type: 'telegram:drafts', result: 'error', detail });
    }
  }

  if (delivered === 0) {
    // Nadie lo recibió: se desmarca para reintentar en la próxima ejecución.
    await admin.from('news_drafts').update({ notified_at: null }).in('id', claimed.map((d) => d.id));
    return NextResponse.json({ ok: false, notified: 0, error: 'telegram rejected' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, notified: claimed.length, delivered });
}
