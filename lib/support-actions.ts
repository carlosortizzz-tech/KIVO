'use server';

import { createClient } from '@/lib/supabase/server';
import { sendSupportTicketConfirmation, sendSupportTicketNotification } from '@/lib/email';

const IN_APP_CATEGORIES = ['payment', 'bug', 'other'] as const;
export type InAppCategory = (typeof IN_APP_CATEGORIES)[number];

const PUBLIC_CATEGORIES = ['access', 'other'] as const;
export type PublicCategory = (typeof PUBLIC_CATEGORIES)[number];

// 59-SOPORTE-CLIENTE.md, canal mínimo viable: formulario in-app → tabla support_tickets +
// email a soporte@ (Resend) + confirmación instantánea "lo recibimos" al usuario.
//
// Usa un RPC SECURITY DEFINER (submit_support_ticket) en vez de un insert directo bajo RLS —
// mismo patrón ya probado en producción que submit_safe_report/submit_forum_post. El primer
// intento (insert directo + política RLS "insert own ticket") falló en la prueba real del
// usuario: el ticket nunca llegó a quedar guardado. Se corrigió moviendo la escritura a la
// base de datos, que es el único camino que este proyecto ya confirmó que funciona para
// escrituras autenticadas desde un Server Action.
//
// "access" (no me llegó el acceso) NO es una categoría válida aquí — si el usuario está
// usando este formulario, ya está DENTRO de la app con sesión iniciada, así que por
// definición sí tiene acceso. Ese caso vive en submitPublicSupportTicket, para gente que
// todavía no puede entrar (hallazgo real del usuario probando el formulario).
export async function submitSupportTicket(category: InAppCategory, message: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('unauthorized');
  if (!IN_APP_CATEGORIES.includes(category)) throw new Error('categoría inválida');
  if (!message.trim()) throw new Error('falta el mensaje');

  const { error } = await supabase.rpc('submit_support_ticket', {
    p_category: category,
    p_message: message,
  });
  if (error) throw new Error(error.message);

  await Promise.all([
    sendSupportTicketNotification(user.email, category, message.trim()),
    sendSupportTicketConfirmation(user.email),
  ]);
}

// Ticket público (sin sesión) — para quien todavía no puede entrar a KIVO. Vive fuera de la
// app (login/landing), así que no hay `user` de quien tomar el email: lo escribe la persona.
export async function submitPublicSupportTicket(email: string, category: PublicCategory, message: string): Promise<void> {
  if (!email.trim()) throw new Error('falta el correo');
  if (!PUBLIC_CATEGORIES.includes(category)) throw new Error('categoría inválida');
  if (!message.trim()) throw new Error('falta el mensaje');

  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_public_support_ticket', {
    p_email: email.trim(),
    p_category: category,
    p_message: message,
  });
  if (error) throw new Error(error.message);

  await Promise.all([
    sendSupportTicketNotification(email.trim(), category, message.trim()),
    sendSupportTicketConfirmation(email.trim()),
  ]);
}
