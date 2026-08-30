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
