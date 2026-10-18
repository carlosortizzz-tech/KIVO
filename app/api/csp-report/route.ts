import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Recibe los avisos de la política de contenido (CSP) que el navegador de cada persona manda cuando
// algo habría sido bloqueado (la política está en modo SOLO REPORTAR, ver next.config.ts). Sirve para
// revisar, con uso real y con sesión iniciada, qué se rompería antes de activar el modo estricto.
//
// Es una ruta pública (el navegador no manda credenciales), así que se protege por tamaño y por
// volumen: cuerpo máximo 8 KB, texto recortado y tope de filas por hora. Siempre responde 204.
const MAX_BODY = 8192;
const MAX_ROWS_PER_HOUR = 200;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const ignored = () => new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) return new NextResponse(null, { status: 413 });
  const raw = await req.text().catch(() => '');
  if (!raw || raw.length > MAX_BODY) return ignored();

  let report: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(raw);
    // Formato clásico {"csp-report": {...}} o el nuevo de Reporting API [{"body": {...}}]
    report = (parsed?.['csp-report'] ?? (Array.isArray(parsed) ? parsed[0]?.body : parsed)) ?? null;
  } catch {
    return ignored();
  }
  if (!report || typeof report !== 'object') return ignored();

  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
  const directive = text(report['effective-directive'] ?? report['violated-directive'] ?? report.effectiveDirective, 80);
  const blocked = text(report['blocked-uri'] ?? report.blockedURL, 200);
  const documentUri = text(report['document-uri'] ?? report.documentURL, 300);
  let path = '';
  try {
    path = new URL(documentUri).pathname;
  } catch {
    path = '';
  }

  // Ruido de extensiones del navegador: no es de KIVO.
  if (/^(chrome|moz|safari|edge)(-extension)?:/i.test(blocked)) return ignored();
  if (!directive) return ignored();

  const admin = getAdmin();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin
    .from('webhook_log')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'csp:violation')
    .gte('received_at', since);
  if ((count ?? 0) >= MAX_ROWS_PER_HOUR) return ignored();

  // webhook_log.result solo admite: applied, duplicate, illegal, unauthorized, error, ignored.
  const { error } = await admin.from('webhook_log').insert({ type: 'csp:violation', result: 'applied', detail: `${directive} | ${blocked} | ${path}` });
  if (error) console.error('csp-report: no se pudo guardar el aviso', error.message);
  return ignored();
}
