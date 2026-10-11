'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export type DeleteAccountResult = { status: 'ok' } | { status: 'error' };

const BUCKETS = ['avatars', 'concert-photos'] as const;

// Elimina la cuenta de la persona que tiene la sesión abierta y todo lo suyo. Solo actúa sobre la
// cuenta de la sesión actual — nunca recibe un id de usuario desde el cliente.
// Orden: primero lo que NO se borra solo (archivos y mensajes de soporte), al final la cuenta.
// Si algo previo falla se corta antes de borrar la cuenta, para poder reintentar sin dejar archivos
// huérfanos. Al borrar la cuenta, la base de datos elimina en cascada perfil, publicaciones,
// comentarios, avisos, insignias, experiencias, reportes y bloqueos.
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error' };

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  for (const bucket of BUCKETS) {
    const { data: files, error: listError } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
    if (listError) {
      console.error('deleteAccount: no se pudo listar archivos', bucket, listError.message);
      return { status: 'error' };
    }
    if (files && files.length > 0) {
      const { error: removeError } = await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
      if (removeError) {
        console.error('deleteAccount: no se pudieron borrar archivos', bucket, removeError.message);
        return { status: 'error' };
      }
    }
  }

  // Los mensajes de soporte quedan con el correo aunque se borre la cuenta (user_id pasa a NULL),
  // así que se eliminan aquí, por cuenta y por correo.
  const emails = user.email ? Array.from(new Set([user.email, user.email.toLowerCase()])) : [];
  const { error: ticketsByUser } = await admin.from('support_tickets').delete().eq('user_id', user.id);
  if (ticketsByUser) {
    console.error('deleteAccount: no se pudieron borrar mensajes de soporte', ticketsByUser.message);
    return { status: 'error' };
  }
  for (const email of emails) {
    const { error } = await admin.from('support_tickets').delete().eq('email', email);
    if (error) {
      console.error('deleteAccount: no se pudieron borrar mensajes de soporte', error.message);
      return { status: 'error' };
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('deleteAccount: no se pudo eliminar la cuenta', deleteError.message);
    return { status: 'error' };
  }

  await supabase.auth.signOut();
  return { status: 'ok' };
}
