import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { LiveNowForm } from '@/components/app/LiveNowForm';

export default async function AdminLivePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect('/app');
  }

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">Admin</div>
      <h1 className="font-display text-lg font-extrabold mb-4">Live ahora</h1>
      <p className="text-[13px] text-text2 mb-4">
        Manda un aviso por email a todos los usuarios Pro, ahora mismo. Úsalo cuando veas un live
        empezar en tu Weverse y quieras avisarles de inmediato.
      </p>
      <LiveNowForm />
    </div>
  );
}
