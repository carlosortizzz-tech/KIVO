'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { ageFromBirthYear, isValidBirthYear, MIN_AGE } from '@/lib/age';

export type ConfirmAgeResult = { status: 'ok' } | { status: 'underage' } | { status: 'error' };

// Guarda el año de nacimiento de la persona que tiene la sesión abierta. Si declara menos de 13 años,
// se elimina su cuenta y sus datos (como dice la política de privacidad) y se cierra la sesión.
// Solo actúa sobre la cuenta de la sesión actual — nunca recibe un id de usuario desde el cliente.
export async function confirmAge(year: number): Promise<ConfirmAgeResult> {
  if (!isValidBirthYear(year)) return { status: 'error' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error' };

  if (ageFromBirthYear(year) < MIN_AGE) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { error } = await admin.auth.admin.deleteUser(user.id);
    await supabase.auth.signOut();
    // Si no se pudo borrar, se avisa igual a la persona (la sesión ya se cerró) y queda en el log.
    if (error) console.error('confirmAge: no se pudo eliminar la cuenta de un menor', error.message);
    return { status: 'underage' };
  }

  const { error } = await supabase.rpc('set_birth_year', { p_year: year });
  return error ? { status: 'error' } : { status: 'ok' };
}
