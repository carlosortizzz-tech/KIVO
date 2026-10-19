import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/app/BottomNav';
import { getUserPlan } from '@/lib/plan';
import { isAdminEmail } from '@/lib/admin';
import { Link } from '@/i18n/navigation';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Radio, LayoutDashboard, Newspaper } from 'lucide-react';
import { AnalyticsSession } from '@/components/app/AnalyticsSession';
import { LocaleSwitcherInline } from '@/components/app/LocaleSwitcher';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initial = (user?.email?.[0] ?? 'S').toUpperCase();
  const plan = await getUserPlan();
  const isAdmin = isAdminEmail(user?.email);

  // Solo para administradores: cuántas noticias esperan aprobación (globito del icono de noticias).
  let pendingDrafts = 0;
  if (isAdmin) {
    const { count } = await createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
      .from('news_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    pendingDrafts = count ?? 0;
  }

  let diasDesdeAlta = 0;
  let source = 'directo';
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('created_at, source, terms_accepted_at, birth_year').eq('id', user.id).maybeSingle();
    // Sin constancia de la autorización de datos (Ley 1581) ni confirmación de edad (mínimo 13) no se
    // usa la app: cubre también a quien ya tenía la sesión abierta de antes, que no pasa por
    // lib/auth-finalize.ts.
    if (profile && (!profile.terms_accepted_at || profile.birth_year == null)) redirect('/aceptar?next=%2Fapp');
    if (profile?.created_at) {
      diasDesdeAlta = Math.max(0, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000));
    }
    // Fuente de verdad server-side (36-ANALITICA-Y-EVENTOS): profiles.source, no localStorage,
    // que ya pudo borrarse o venir de otro dispositivo para cuando el usuario llega aquí.
    if (profile?.source) source = profile.source;
  }

  return (
    <div className="max-w-[480px] mx-auto w-full min-h-dvh flex flex-col">
      {user && <AnalyticsSession userId={user.id} plan={plan} diasDesdeAlta={diasDesdeAlta} source={source} />}
      <header className="flex items-center justify-between px-5 py-5">
        <div className="relative inline-block font-display font-extrabold text-lg">
          <span className="relative z-10">KIVO</span>
          <span
            className="absolute -inset-y-1 -inset-x-2.5 -rotate-2 rounded-[9999px_9999px_9999px_12px] border-2 border-accent"
            style={{ boxShadow: 'var(--glow)' }}
          />
        </div>
        <div className="flex items-center gap-2.5">
          <LocaleSwitcherInline />
          {isAdmin && (
            <>
              <Link href="/app/admin/noticias" aria-label="Noticias por aprobar" className="relative w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-text2">
                <Newspaper size={16} strokeWidth={2} />
                {pendingDrafts > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-accent-btn text-white text-xs font-bold leading-4 text-center">
                    {pendingDrafts}
                  </span>
                )}
              </Link>
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
