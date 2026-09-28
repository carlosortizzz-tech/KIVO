import { getTranslations } from 'next-intl/server';
import { ShieldCheck } from 'lucide-react';
import { AcceptTermsForm } from '@/components/app/AcceptTermsForm';
import { LogoutButton } from '@/components/app/LogoutButton';
import { safeNextPath } from '@/lib/auth-redirect';

// Paso único para cuentas sin constancia de la autorización de datos (Ley 1581): las creadas por un
// camino sin la casilla (Google desde /login) y las anteriores a que se guardara la constancia.
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

  const t = await getTranslations('aceptar');
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
        <p className="text-sm text-text2 leading-relaxed max-w-[34ch]">{t('body')}</p>
        <div className="w-full pt-2 flex flex-col gap-3">
          <AcceptTermsForm next={next} />
          <LogoutButton label={t('logout')} />
        </div>
      </main>
    </div>
  );
}
