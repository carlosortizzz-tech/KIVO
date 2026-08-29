import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { generateMemberCode } from '@/lib/kivo-id';

export default async function KivoIdPage() {
  const locale = await getLocale();
  const t = await getTranslations('cuenta');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, plan, created_at, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const name = profile?.display_name || user.email?.split('@')[0] || 'Fan';
  const isPro = profile?.plan === 'pro';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const code = generateMemberCode(user.id);

  return (
    <div>
      <Link href="/app/cuenta" className="text-xs text-text2 mb-4 inline-block">{t('back')}</Link>
      <h1 className="font-display text-lg font-extrabold mb-5">{t('idTitle')}</h1>

      <div className="feature-card rounded-[24px] p-6 text-center relative overflow-hidden" style={{ boxShadow: 'var(--glow)' }}>
        <div className="relative inline-block font-display font-extrabold text-lg mb-6">
          <span className="relative z-10">KIVO ID</span>
          <span
            className="absolute -inset-y-1 -inset-x-2.5 -rotate-2 rounded-[9999px_9999px_9999px_12px] border-2 border-accent"
            style={{ boxShadow: 'var(--glow)' }}
          />
        </div>

        <div className="w-20 h-20 rounded-full bg-accent-btn mx-auto mb-4 flex items-center justify-center font-display text-2xl font-extrabold overflow-hidden" style={{ boxShadow: 'var(--glow)' }}>
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt={name} width={80} height={80} className="w-full h-full object-cover" />
          ) : (
            name[0]?.toUpperCase()
          )}
        </div>

        <div className="font-display text-xl font-extrabold mb-1">{name}</div>
        <div className="text-xs text-text2 mb-5">
          {isPro ? t('planPro') : t('planFree')}
          {memberSince && ` · ${t('memberSince', { date: memberSince })}`}
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-text2 mb-1">{t('idCode')}</div>
          <div className="font-display text-lg font-extrabold tracking-wider text-accent2">{code}</div>
        </div>
      </div>

      <p className="text-xs text-text2 text-center mt-4 leading-relaxed">{t('idFooter')}</p>
    </div>
  );
}
