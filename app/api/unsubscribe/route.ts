import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidUnsubscribeToken } from '@/lib/unsubscribe';

export const runtime = 'nodejs';

type Lang = 'es' | 'en' | 'fr' | 'ko';
const LANGS: Lang[] = ['es', 'en', 'fr', 'ko'];

const T: Record<Lang, { askTitle: string; askBody: string; askBtn: string; doneTitle: string; doneBody: string; badTitle: string; badBody: string }> = {
  es: {
    askTitle: 'Darte de baja de los mensajes de KIVO',
    askBody: '¿Quieres dejar de recibir mensajes de KIVO, como preguntas sobre tu experiencia o invitaciones? Seguirás recibiendo los correos que necesitas para usar KIVO: accesos, avisos que pediste y pagos.',
    askBtn: 'Sí, darme de baja',
    doneTitle: 'Listo, ya no te escribiremos',
    doneBody: 'Seguirás recibiendo solo los correos necesarios para usar KIVO. Si fue un error, escríbenos a soporte@kivoapp.app.',
    badTitle: 'Enlace no válido',
    badBody: 'Este enlace no es válido o está incompleto. Escríbenos a soporte@kivoapp.app y te damos de baja.',
  },
  en: {
    askTitle: 'Unsubscribe from KIVO messages',
    askBody: 'Do you want to stop receiving messages from KIVO, such as questions about your experience or invitations? You will still get the emails you need to use KIVO: access links, alerts you asked for, and payments.',
    askBtn: 'Yes, unsubscribe me',
    doneTitle: "Done, we won't write to you",
    doneBody: 'You will only keep receiving the emails needed to use KIVO. If this was a mistake, write to soporte@kivoapp.app.',
    badTitle: 'Invalid link',
    badBody: 'This link is invalid or incomplete. Write to soporte@kivoapp.app and we will unsubscribe you.',
  },
  fr: {
    askTitle: 'Te désabonner des messages de KIVO',
    askBody: "Tu veux arrêter de recevoir des messages de KIVO, comme des questions sur ton expérience ou des invitations ? Tu continueras à recevoir les emails dont tu as besoin pour utiliser KIVO : accès, alertes demandées et paiements.",
    askBtn: 'Oui, me désabonner',
    doneTitle: "C'est fait, on ne t'écrira plus",
    doneBody: "Tu ne recevras plus que les emails nécessaires pour utiliser KIVO. Si c'était une erreur, écris-nous à soporte@kivoapp.app.",
    badTitle: 'Lien non valide',
    badBody: "Ce lien n'est pas valide ou est incomplet. Écris-nous à soporte@kivoapp.app et on te désabonne.",
  },
  ko: {
    askTitle: 'KIVO 메시지 수신 거부',
    askBody: 'KIVO의 이용 소감 질문이나 초대 같은 메시지를 더 이상 받고 싶지 않으신가요? 접속 링크, 요청하신 알림, 결제 안내처럼 KIVO 이용에 필요한 이메일은 계속 받으시게 됩니다.',
    askBtn: '네, 수신 거부합니다',
    doneTitle: '완료되었습니다. 더 이상 연락드리지 않겠습니다',
    doneBody: 'KIVO 이용에 필요한 이메일만 계속 받으시게 됩니다. 실수였다면 soporte@kivoapp.app으로 알려 주세요.',
    badTitle: '유효하지 않은 링크',
    badBody: '링크가 유효하지 않거나 불완전합니다. soporte@kivoapp.app으로 연락 주시면 수신 거부 처리해 드립니다.',
  },
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function pageHtml(lang: Lang, title: string, body: string, action?: { url: string; label: string }): string {
  const button = action
    ? `<form method="POST" action="${esc(action.url)}"><input type="hidden" name="confirm" value="1"><button type="submit">${esc(action.label)}</button></form>`
    : '';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>KIVO</title>
<style>body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0B0710;color:#F5EFFC;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px}
.card{max-width:420px;width:100%;background:#17101F;border:1px solid #2a1d3a;border-radius:20px;padding:32px 24px;text-align:center}
.logo{display:inline-block;padding:8px 20px;border:2px solid #B44FF5;border-radius:999px;font-weight:800;font-size:18px;letter-spacing:.5px;color:#B44FF5;margin-bottom:24px}
h1{font-size:20px;margin:0 0 12px}p{color:#A896C4;font-size:15px;line-height:1.5;margin:0 0 24px}
button{background:#7C3AED;color:#fff;border:0;border-radius:12px;padding:14px 28px;font-size:15px;font-weight:600;cursor:pointer;width:100%}</style></head>
<body><div class="card"><div class="logo">KIVO</div><h1>${esc(title)}</h1><p>${esc(body)}</p>${button}</div></body></html>`;
}

function pickLang(raw: string | null): Lang {
  return (LANGS as string[]).includes(raw ?? '') ? (raw as Lang) : 'es';
}

function html(status: number, content: string) {
  return new Response(content, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = pickLang(sp.get('l'));
  const u = sp.get('u') ?? '';
  const t = sp.get('t') ?? '';
  if (!isValidUnsubscribeToken(u, t)) return html(400, pageHtml(lang, T[lang].badTitle, T[lang].badBody));
  // Solo muestra el botón: abrir el enlace NO da de baja. Los antivirus de correo "abren" los enlaces
  // y, si la baja se hiciera con el GET, darían de baja a todos sin querer.
  return html(200, pageHtml(lang, T[lang].askTitle, T[lang].askBody, { url: req.nextUrl.pathname + req.nextUrl.search, label: T[lang].askBtn }));
}

export async function POST(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = pickLang(sp.get('l'));
  const u = sp.get('u') ?? '';
  const t = sp.get('t') ?? '';
  if (!isValidUnsubscribeToken(u, t)) return html(400, pageHtml(lang, T[lang].badTitle, T[lang].badBody));

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await admin
    .from('profiles')
    .update({ email_opt_out_at: new Date().toISOString() })
    .eq('id', u)
    .is('email_opt_out_at', null);
  if (error) return html(500, pageHtml(lang, T[lang].badTitle, T[lang].badBody));

  // Baja de un clic desde el cliente de correo (List-Unsubscribe-Post): responde 200 sin página.
  const form = await req.formData().catch(() => null);
  const fromOurPage = form?.get('confirm') === '1';
  if (!fromOurPage) return new Response('ok', { status: 200 });
  return html(200, pageHtml(lang, T[lang].doneTitle, T[lang].doneBody));
}
