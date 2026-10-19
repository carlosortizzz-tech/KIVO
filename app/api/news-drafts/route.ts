import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidBearer } from '@/lib/bearer-auth';

export const runtime = 'nodejs';

// Entrada segura para que una tarea automática (Claude en la nube) deje BORRADORES de noticias.
// Solo puede crear filas en news_drafts con status 'pending': nunca publica (eso lo hace una persona
// administradora con el botón Publicar) y no lee ni toca ninguna otra tabla. Usa su propia clave
// (NEWS_INGEST_SECRET), distinta de la del resto de procesos, que se puede cambiar sin afectar nada más.
//
// Falla cerrado: sin NEWS_INGEST_SECRET responde 503 y no acepta nada.
const MAX_BODY = 32_768;
const MAX_PER_DAY = 15;
const CATEGORIES = ['concierto', 'lanzamiento', 'gira', 'comunidad', 'oficial'];
const LANG_FIELDS = ['headline', 'summary', 'headline_en', 'summary_en', 'headline_fr', 'summary_fr', 'headline_ko', 'summary_ko'] as const;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.hostname.replace(/^www\./, '').toLowerCase() : null;
  } catch {
    return null;
  }
}

const text = (v: unknown, min: number, max: number): string | null =>
  typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null;

export async function POST(req: NextRequest) {
  if (!process.env.NEWS_INGEST_SECRET) return fail(503, 'not configured');
  if (!isValidBearer(req.headers.get('authorization'), process.env.NEWS_INGEST_SECRET)) return fail(401, 'unauthorized');

  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) return fail(413, 'body too large');
  const raw = await req.text().catch(() => '');
  if (!raw || raw.length > MAX_BODY) return fail(413, 'body too large or empty');
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, 'invalid json');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'invalid json');

  // Textos en los 4 idiomas (titular ≤ 200, resumen ≤ 900 caracteres).
  const row: Record<string, unknown> = {};
  for (const key of LANG_FIELDS) {
    const v = text(body[key], 1, key.startsWith('headline') ? 200 : 900);
    if (!v) return fail(400, `missing or invalid field: ${key}`);
    row[key] = v;
  }

  const category = String(body.category ?? '');
  if (!CATEGORIES.includes(category)) return fail(400, `category must be one of: ${CATEGORIES.join(', ')}`);
  row.category = category;

  const place = body.place == null ? null : text(body.place, 1, 40);
  if (body.place != null && !place) return fail(400, 'place must be 1-40 characters');
  row.place = place;

  // Fuentes: de 2 a 5, https, con al menos 2 sitios distintos (regla de KIVO: cada dato con 2 fuentes).
  const sources = Array.isArray(body.sources) ? body.sources : [];
  if (sources.length < 2 || sources.length > 5) return fail(400, 'sources must have 2 to 5 items');
  const cleanSources: { name: string; url: string }[] = [];
  for (const s of sources as Record<string, unknown>[]) {
    const name = text(s?.name, 1, 60);
    const url = text(s?.url, 8, 500);
    if (!name || !url || !hostOf(url)) return fail(400, 'each source needs a name and an https url');
    cleanSources.push({ name, url });
  }
  if (new Set(cleanSources.map((s) => hostOf(s.url))).size < 2) return fail(400, 'sources must come from at least 2 different sites');
  row.sources = cleanSources;

  const notes = body.notes == null ? null : text(body.notes, 1, 1000);
  if (body.notes != null && !notes) return fail(400, 'notes must be up to 1000 characters');
  row.notes = notes;

  // Foto libre opcional: solo de Wikimedia, y con crédito.
  if (body.image_source_url != null) {
    const img = text(body.image_source_url, 10, 500);
    const credit = text(body.image_credit, 1, 120);
    if (!img || !/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(img)) return fail(400, 'image_source_url must be a wikimedia.org https url');
    if (!credit) return fail(400, 'image_credit is required with an image (author and license, up to 120 characters)');
    row.image_source_url = img;
    row.image_credit = credit;
  }

  row.origin = 'claude-cloud';
  row.status = 'pending';

  const admin = getAdmin();

  // Tope diario: si algo se descontrola, no llena la cola de aprobación.
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from('news_drafts').select('id', { count: 'exact', head: true }).eq('origin', 'claude-cloud').gte('created_at', since);
  if ((count ?? 0) >= MAX_PER_DAY) return fail(429, 'daily limit reached');

  // Sin duplicados: ninguna de las fuentes puede estar ya en otro borrador o en una noticia publicada.
  for (const s of cleanSources) {
    const [{ data: inDrafts }, { data: inNews }] = await Promise.all([
      admin.from('news_drafts').select('id').contains('sources', [{ url: s.url }]).limit(1),
      admin.from('news_items').select('id').eq('source_url', s.url).limit(1),
    ]);
    if ((inDrafts?.length ?? 0) > 0 || (inNews?.length ?? 0) > 0) return fail(409, `duplicate: source already used (${hostOf(s.url)})`);
  }

  const { data, error } = await admin.from('news_drafts').insert(row).select('id').single();
  if (error || !data) {
    console.error('news-drafts: no se pudo guardar el borrador', error?.message);
    return fail(500, 'could not save draft');
  }
  return NextResponse.json({ ok: true, id: data.id, status: 'pending' }, { status: 201 });
}
