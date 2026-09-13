'use server';

import { createClient } from '@/lib/supabase/server';
import { sendSupportTicketConfirmation, sendSupportTicketNotification } from '@/lib/email';

const CATEGORIES = ['access', 'payment', 'bug', 'other'] as const;
type Category = (typeof CATEGORIES)[number];

// 59-SOPORTE-CLIENTE.md, canal mínimo viable: formulario in-app → tabla support_tickets +
// email a soporte@ (Resend) + confirmación instantánea "lo recibimos" al usuario. Sin RPC
// atómico porque no hay efecto secundario que coordinar (a diferencia de submitSafeReport):
// el insert directo ya queda protegido por la política RLS "insert own ticket".
export async function submitSupportTicket(category: Category, message: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('unauthorized');
  if (!CATEGORIES.includes(category)) throw new Error('categoría inválida');
  if (!message.trim()) throw new Error('falta el mensaje');

  const { error } = await supabase.from('support_tickets').insert({
    user_id: user.id,
    email: user.email,
    category,
    message: message.trim(),
  });
  if (error) throw new Error(error.message);

  await Promise.all([
    sendSupportTicketNotification(user.email, category, message.trim()),
    sendSupportTicketConfirmation(user.email),
  ]);
}
