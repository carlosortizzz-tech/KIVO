'use server';

import { createClient } from '@/lib/supabase/server';

// Server action porque el badge "primer_reporte" (24-GAMIFICACION) necesita verificar de forma
// atómica si es el primer reporte del usuario ANTES de otorgarlo — hacerlo en el cliente permitiría
// a alguien insertar el reporte y decidir por su cuenta si "ya tenía" el badge.
export async function submitSafeReport(urlOrSeller: string, reason: string): Promise<{ badgeUnlocked: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  if (!urlOrSeller.trim() || !reason.trim()) throw new Error('faltan datos');

  // ¿Es su primer reporte? Se pregunta ANTES de insertar el nuevo.
  const { count } = await supabase
    .from('safe_reports')
    .select('id', { count: 'exact', head: true })
    .eq('reported_by', user.id);
  const isFirst = (count ?? 0) === 0;

  const { error } = await supabase.from('safe_reports').insert({
    reported_by: user.id,
    url_or_seller: urlOrSeller.trim(),
    reason: reason.trim(),
  });
  if (error) throw new Error(error.message);

  let badgeUnlocked = false;
  if (isFirst) {
    const { data: badge } = await supabase.from('badges').select('id').eq('code', 'primer_reporte').maybeSingle();
    if (badge) {
      const { error: badgeErr } = await supabase
        .from('user_badges')
        .upsert({ user_id: user.id, badge_id: badge.id }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
      if (!badgeErr) badgeUnlocked = true;
    }
  }

  return { badgeUnlocked };
}
