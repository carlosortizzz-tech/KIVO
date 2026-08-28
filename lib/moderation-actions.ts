'use server';

import { createClient } from '@/lib/supabase/server';

// Usa el cliente con la sesión del usuario (NO service role) — el RLS de forum_reports/
// user_blocks ya obliga reported_by/blocker_id = auth.uid(), así que no hace falta duplicar
// esa validación acá: si alguien intenta reportar "como" otro usuario, la base de datos lo rechaza.

export async function reportContent(targetId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');

  const { error } = await supabase.from('forum_reports').insert({
    reported_by: user.id,
    target_type: 'post',
    target_id: targetId,
    reason,
  });
  if (error) throw new Error(error.message);
}

export async function blockUser(blockedUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  if (user.id === blockedUserId) throw new Error('no puedes bloquearte a ti mismo');

  const { error } = await supabase.from('user_blocks').insert({
    blocker_id: user.id,
    blocked_id: blockedUserId,
  });
  // Ignorar duplicado (ya lo tenía bloqueado) — no es un error real para el usuario.
  if (error && error.code !== '23505') throw new Error(error.message);
}
