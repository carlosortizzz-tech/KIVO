import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/app/BottomNav';
import { getUserPlan } from '@/lib/plan';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initial = (user?.email?.[0] ?? 'S').toUpperCase();
  const plan = await getUserPlan();

  return (
    <div className="max-w-[480px] mx-auto w-full min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-5 py-5">
        <div className="font-display font-extrabold text-lg text-accent2" style={{ textShadow: '0 0 14px rgba(180,79,245,0.6)' }}>KIVO</div>
        <div className="firma-icon w-9 h-9 rounded-full bg-accent-btn flex items-center justify-center font-bold text-sm" style={{ boxShadow: 'var(--glow)' }}>
          {initial}
        </div>
      </header>
      <main className="flex-1 px-5 pb-6">{children}</main>
      <BottomNav plan={plan} />
    </div>
  );
}
