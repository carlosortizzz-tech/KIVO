import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/app/BottomNav';
import { getUserPlan } from '@/lib/plan';
import { isAdminEmail } from '@/lib/admin';
import { Link } from '@/i18n/navigation';
import { Radio, LayoutDashboard } from 'lucide-react';
import { AnalyticsSession } from '@/components/app/AnalyticsSession';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initial = (user?.email?.[0] ?? 'S').toUpperCase();
  const plan = await getUserPlan();
  const isAdmin = isAdminEmail(user?.email);

  let diasDesdeAlta = 0;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('created_at').eq('id', user.id).maybeSingle();
    if (profile?.created_at) {
      diasDesdeAlta = Math.max(0, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000));
    }
  }

  return (
    <div className="max-w-[480px] mx-auto w-full min-h-dvh flex flex-col">
      {user && <AnalyticsSession userId={user.id} plan={plan} diasDesdeAlta={diasDesdeAlta} />}
      <header className="flex items-center justify-between px-5 py-5">
        <div className="relative inline-block font-display font-extrabold text-lg">
          <span className="relative z-10">KIVO</span>
          <span
            className="absolute -inset-y-1 -inset-x-2.5 -rotate-2 rounded-[9999px_9999px_9999px_12px] border-2 border-accent"
            style={{ boxShadow: 'var(--glow)' }}
          />
        </div>
        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <>
              <Link href="/app/admin/panel" aria-label="Panel del negocio" className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-text2">
                <LayoutDashboard size={16} strokeWidth={2} />
              </Link>
              <Link href="/app/admin/live" aria-label="Live ahora" className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-text2">
                <Radio size={16} strokeWidth={2} />
              </Link>
            </>
          )}
          <Link href="/app/cuenta" aria-label="Tu cuenta" className="firma-icon w-9 h-9 rounded-full bg-accent-btn flex items-center justify-center font-bold text-sm" style={{ boxShadow: 'var(--glow)' }}>
            {initial}
          </Link>
        </div>
      </header>
      <main className="flex-1 px-5 pb-6">{children}</main>
      <BottomNav plan={plan} />
    </div>
  );
}
