'use server';

import { createClient } from '@/lib/supabase/server';

// El reporte + el badge "primer_reporte" + el XP (24-GAMIFICACION) viven en UNA función atómica
// en la base de datos (submit_safe_report, SECURITY DEFINER) — nunca un insert directo desde
// aquí seguido de una actualización de XP aparte, porque profiles.xp_total no tiene (a propósito)
// permiso de escritura para el cliente. Ver hallazgo de seguridad del 2026-08-29.
export async function submitSafeReport(urlOrSeller: string, reason: string): Promise<{ badgeUnlocked: boolean; xpGained: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  if (!urlOrSeller.trim() || !reason.trim()) throw new Error('faltan datos');

  const { data, error } = await supabase.rpc('submit_safe_report', { p_url: urlOrSeller, p_reason: reason });
  if (error) throw new Error(error.message);

  return { badgeUnlocked: data.badgeUnlocked, xpGained: data.xpGained };
}
