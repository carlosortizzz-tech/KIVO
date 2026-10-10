import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ShieldCheck } from 'lucide-react';
import { AcceptTermsForm } from '@/components/app/AcceptTermsForm';
import { LogoutButton } from '@/components/app/LogoutButton';
import { safeNextPath } from '@/lib/auth-redirect';
import { createClient } from '@/lib/supabase/server';

// Paso único para cuentas a las que les falta la constancia de la autorización de datos (Ley 1581)
// y/o confirmar la edad (mínimo 13): las creadas por un camino sin esos pasos (Google desde /login),
// las anteriores a que existieran, y las creadas por una compra de Hotmart.
// Llegan aquí desde lib/auth-finalize.ts o desde app/[locale]/app/layout.tsx; exige sesión
// (no está en las rutas públicas de lib/supabase/middleware.ts).
export default async function AceptarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawNext = typeof params.next === 'string' ? params.next : null;
  // Solo rutas internas (mismo criterio anti open-redirect que el login); si no, a la app.
  const next = safeNextPath(rawNext, 'https://www.kivoapp.app') ?? '/app';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('terms_accepted_at, birth_year').eq('id', user.id).maybeSingle()
    : { data: null };
  const needsConsent = !profile?.terms_accepted_at;
  const needsAge = profile?.birth_year == null;
  // Nada pendiente (p. ej. entró aquí por un enlace viejo): sigue a donde iba.
  if (!needsConsent && !needsAge) redirect(next);

  const t = await getTranslations('aceptar');
  const body = needsConsent && needsAge ? t('bodyBoth') : needsAge ? t('bodyAge') : t('body');
  return (
    <div className="max-w-[420px] mx-auto w-full min-h-dvh flex flex-col px-5">
      <div className="flex items-center justify-center py-6">
        <div className="font-display font-extrabold text-xl text-accent2" style={{ textShadow: '0 0 18px rgba(180,79,245,0.7)' }}>KIVO</div>
      </div>
      <main className="flex-1 flex flex-col items-center justify-center gap-4 text-center pb-16">
        <div className="icon-chip-accent firma-icon w-14 h-14 rounded-full flex items-center justify-center">
          <ShieldCheck size={24} strokeWidth={2} />
        </div>
        <h1 className="font-display text-2xl font-extrabold">{t('title')}</h1>
        <p className="text-sm text-text2 leading-relaxed max-w-[34ch]">{body}</p>
        <div className="w-full pt-2 flex flex-col gap-3">
          <AcceptTermsForm next={next} needsConsent={needsConsent} needsAge={needsAge} />
          <LogoutButton label={t('logout')} />
        </div>
      </main>
    </div>
  );
}
