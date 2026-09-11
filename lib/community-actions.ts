'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// El post + el XP (24-GAMIFICACION) viven en UNA función atómica en la base de datos
// (submit_forum_post, SECURITY DEFINER) — mismo patrón que submit_safe_report y bump_streak().
export async function submitForumPost(category: string, body: string): Promise<{ xpGained: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  if (!category.trim() || !body.trim()) throw new Error('faltan datos');

  const { data, error } = await supabase.rpc('submit_forum_post', { p_category: category, p_body: body });
  if (error) throw new Error(error.message);

  revalidatePath('/app/community');
  return { xpGained: data.xpGained };
}

// Borrado suave: la política RLS `forum_posts_update_own` ya solo permite al dueño actualizar
// su propia fila, y `forum_posts_read` ya excluye `deleted_at IS NOT NULL` — no hace falta RPC
// nueva, solo el UPDATE directo (mismo patrón de confianza en RLS que el resto del proyecto).
export async function deleteForumPost(postId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');

  const { error } = await supabase.from('forum_posts').update({ deleted_at: new Date().toISOString() }).eq('id', postId);
  if (error) throw new Error(error.message);

  revalidatePath('/app/community');
}
