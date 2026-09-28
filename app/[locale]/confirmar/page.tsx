import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ShieldCheck } from 'lucide-react';
import { ConfirmLoginForm } from '@/components/app/ConfirmLoginForm';

// Paso intermedio del enlace del correo: /auth/confirm (GET) manda aquí sin canjear nada, y el
// canje ocurre solo cuando la persona toca el botón (POST). Así los verificadores de links de los
// correos no pueden gastar el enlace antes que ella — ver app/auth/confirm/route.ts.
export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : null;
  const type = typeof params.type === 'string' ? params.type : null;
  const next = typeof params.next === 'string' ? params.next : null;
  if (!tokenHash || !type) redirect('/login?error=link');

  const t = await getTranslations('confirmar');
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
        <p className="text-sm text-text2 leading-relaxed max-w-[32ch]">{t('body')}</p>
        <div className="w-full pt-2">
          <ConfirmLoginForm tokenHash={tokenHash} type={type} next={next} ctaLabel={t('cta')} sendingLabel={t('sending')} />
        </div>
      </main>
    </div>
  );
}
