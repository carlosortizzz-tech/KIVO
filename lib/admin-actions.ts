'use server';

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Rescate manual: activa o quita Pro a un usuario a mano, para cuando el webhook de Hotmart
// falla o queda un caso raro sin resolver. Solo el dueño (isAdminEmail) puede llamarlo — se
// revalida la sesión en el servidor, nunca se confía en lo que mande el cliente.
export async function setUserPlanManually(userId: string, plan: 'free' | 'pro') {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error('unauthorized');
  }

  const admin = getAdmin();
  const { error } = await admin
    .from('profiles')
    .update({
      plan,
      status: plan === 'pro' ? 'active' : 'cancelled',
      pro_since: plan === 'pro' ? new Date().toISOString() : null,
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await admin.from('webhook_log').insert({
    type: 'admin:manual_plan_change',
    result: 'applied',
    detail: `user_id=${userId} new_plan=${plan} by=${user.email}`,
  });
}
