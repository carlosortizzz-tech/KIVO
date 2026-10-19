'use server';

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Rescate manual: activa o quita Pro a un usuario a mano, para cuando el webhook de Hotmart
// falla o queda un caso raro sin resolver. Solo el dueño (isAdminEmail) puede llamarlo — se
// revalida la sesión en el servidor, nunca se confía en lo que mande el cliente.
export async function setUserPlanManually(userId: string, plan: 'free' | 'pro') {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error('unauthorized');
  }

  const admin = getAdmin();
  const { error } = await admin
    .from('profiles')
    .update({
      plan,
      status: plan === 'pro' ? 'active' : 'cancelled',
      pro_since: plan === 'pro' ? new Date().toISOString() : null,
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await admin.from('webhook_log').insert({
    type: 'admin:manual_plan_change',
    result: 'applied',
    detail: `user_id=${userId} new_plan=${plan} by=${user.email}`,
  });
}

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) throw new Error('unauthorized');
  return user;
}

// Moderación (47-LEGAL-FISCAL-Y-PRIVACIDAD): el dueño revisa lo reportado por la comunidad y
// decide — descartar el reporte, o eliminar la publicación reportada.
export async function dismissReport(reportId: string) {
  await requireAdmin();
  const admin = getAdmin();
  const { error } = await admin.from('forum_reports').update({ status: 'dismissed' }).eq('id', reportId);
  if (error) throw new Error(error.message);
}

export async function removeReportedContent(reportId: string, targetId: string) {
  await requireAdmin();
  const admin = getAdmin();
  // Solo concert_experiences por ahora (único tipo de UGC con reporte conectado en la UI).
  const { error: deleteErr } = await admin.from('concert_experiences').delete().eq('id', targetId);
  if (deleteErr) throw new Error(deleteErr.message);
  const { error } = await admin.from('forum_reports').update({ status: 'reviewed' }).eq('id', reportId);
  if (error) throw new Error(error.message);
}

// KIVO Safe: el dueño revisa cada reporte y decide si la estafa/vendedor es real (verified_scam,
// entra al puntaje de confianza y a la lista de alertas) o no (verified_safe/dismissed). Sin esto
// el trust score de Safe nunca tenía datos reales que mostrar — quedaba fijo en 100.
export async function resolveSafeReport(reportId: string, status: 'verified_scam' | 'verified_safe' | 'dismissed') {
  await requireAdmin();
  const admin = getAdmin();
  const { error } = await admin.from('safe_reports').update({ status }).eq('id', reportId);
  if (error) throw new Error(error.message);
}

// Noticias por aprobar: la IA propone un borrador (news_drafts) y un administrador lo publica o lo
// descarta desde el celular. Publicar copia el borrador a news_items; de ahí en adelante todo sigue
// igual que con una noticia cargada a mano (Radar, Guide y publicación automática en Telegram).
type DraftSource = { name: string; url: string };

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// Regla de KIVO: cada dato necesita 2 fuentes independientes. Aquí se exige lo que se puede
// comprobar por código: 2 enlaces válidos de dominios distintos y el texto completo en los 4 idiomas.
// Que las fuentes sean realmente independientes (y no una copia de la misma nota) lo juzga quien
// aprueba, con los enlaces a la vista.
function validateDraft(d: Record<string, unknown>): string | null {
  const sources = Array.isArray(d.sources) ? (d.sources as DraftSource[]) : [];
  const hosts = new Set(sources.map((s) => hostOf(s?.url)).filter((h): h is string => !!h));
  if (hosts.size < 2) return 'Necesita al menos 2 fuentes de sitios distintos.';
  if (!['concierto', 'lanzamiento', 'gira', 'comunidad', 'oficial'].includes(String(d.category))) {
    return 'Falta la categoría (concierto, lanzamiento, gira, comunidad u oficial) para dibujar su imagen.';
  }
  for (const key of ['headline', 'summary', 'headline_en', 'summary_en', 'headline_fr', 'summary_fr', 'headline_ko', 'summary_ko']) {
    const v = d[key];
    if (typeof v !== 'string' || !v.trim()) return `Falta el texto en el campo ${key}.`;
  }
  return null;
}

export async function approveNewsDraft(draftId: string) {
  const user = await requireAdmin();
  const admin = getAdmin();

  const { data: draft, error: readErr } = await admin.from('news_drafts').select('*').eq('id', draftId).maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!draft || draft.status !== 'pending') throw new Error('Esta noticia ya fue decidida.');

  const problem = validateDraft(draft);
  if (problem) throw new Error(problem);

  // Se reclama antes de publicar: si se toca dos veces el botón, solo una publica.
  const { data: claimed, error: claimErr } = await admin
    .from('news_drafts')
    .update({ status: 'approved', decided_at: new Date().toISOString(), decided_by: user.email })
    .eq('id', draftId)
    .eq('status', 'pending')
    .select('id');
  if (claimErr) throw new Error(claimErr.message);
  if (!claimed || claimed.length === 0) throw new Error('Esta noticia ya fue decidida.');

  const first = (draft.sources as DraftSource[])[0];
  const { data: item, error: insertErr } = await admin
    .from('news_items')
    .insert({
      kind: 'news',
      headline: draft.headline,
      summary: draft.summary,
      headline_en: draft.headline_en,
      summary_en: draft.summary_en,
      headline_fr: draft.headline_fr,
      summary_fr: draft.summary_fr,
      headline_ko: draft.headline_ko,
      summary_ko: draft.summary_ko,
      source_name: first.name,
      source_url: first.url,
      category: draft.category,
      place: draft.place,
    })
    .select('id')
    .single();
  if (insertErr || !item) {
    await admin.from('news_drafts').update({ status: 'pending', decided_at: null, decided_by: null }).eq('id', draftId);
    throw new Error(insertErr?.message ?? 'No se pudo publicar.');
  }

  await admin.from('news_drafts').update({ news_item_id: item.id }).eq('id', draftId);
  await admin.from('webhook_log').insert({
    type: 'admin:news_approved',
    result: 'applied',
    detail: `draft_id=${draftId} news_id=${item.id} by=${user.email}`,
  });
}

export async function rejectNewsDraft(draftId: string) {
  const user = await requireAdmin();
  const admin = getAdmin();
  const { data, error } = await admin
    .from('news_drafts')
    .update({ status: 'rejected', decided_at: new Date().toISOString(), decided_by: user.email })
    .eq('id', draftId)
    .eq('status', 'pending')
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Esta noticia ya fue decidida.');
}
