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
