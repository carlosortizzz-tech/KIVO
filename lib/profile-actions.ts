'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Guarda nombre + foto en una sola función con alcance limitado a esas 2 columnas (update_profile_appearance,
// SECURITY DEFINER) — mismo patrón que submit_forum_post: nunca un update directo de cliente sobre `profiles`.
export async function updateProfileAppearance(displayName: string, avatarUrl: string | null): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');

  const { error } = await supabase.rpc('update_profile_appearance', {
    p_display_name: displayName,
    p_avatar_url: avatarUrl,
  });
  if (error) throw new Error(error.message);

  revalidatePath('/app/cuenta');
  revalidatePath('/app/cuenta/id');
  revalidatePath('/app/community');
}
