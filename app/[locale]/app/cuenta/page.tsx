import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { ChevronRight, ShieldCheck, FileText, RotateCcw } from 'lucide-react';
import { LogoutButton } from '@/components/app/LogoutButton';
import { ContactSupportButton } from '@/components/app/ContactSupportButton';

export default async function CuentaPage() {
  const locale = await getLocale();
  const t = await getTranslations('cuenta');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, created_at, status, trial_ends_at, plan_amount, plan_currency')
    .eq('id', user.id)
    .maybeSingle();
  const isPro = profile?.plan === 'pro';
  const isTrialing = profile?.status === 'trialing';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const chargeDate = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at).toLocaleDateString(locale, { day: 'numeric', month: 'long' })
    : '';

  const links = [
    { href: '/app/cuenta/cancelar', label: t('cancelLink'), Icon: RotateCcw },
    { href: '/privacidad', label: t('privacyLink'), Icon: ShieldCheck },
    { href: '/terminos', label: t('termsLink'), Icon: FileText },
    { href: '/reembolso', label: t('refundLink'), Icon: FileText },
  ];

  return (
    <div>
      <h1 className="font-display text-lg font-extrabold mb-4">{t('title')}</h1>

      <div className="bg-surface border border-border rounded-2xl p-4 mb-5">
        <div className="text-sm font-bold mb-1">{user.email}</div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isPro ? 'bg-accent/15 text-accent2' : 'bg-border text-text2'}`}>
            {isPro ? t('planPro') : t('planFree')}
          </span>
          {memberSince && <span className="text-xs text-text2">{t('memberSince', { date: memberSince })}</span>}
        </div>
        {isTrialing && chargeDate && (
          <div className="mt-3 pt-3 border-t border-border text-xs text-text2">
            {profile?.plan_amount
              ? t('trialChargeAmount', { date: chargeDate, amount: `${profile.plan_currency ?? '$'}${profile.plan_amount}` })
              : t('trialCharge', { date: chargeDate })}
            {' · '}
            <Link href="/app/cuenta/cancelar" className="text-accent2 font-semibold">{t('cancelLink')}</Link>
          </div>
        )}
      </div>

      <div className="text-xs font-bold uppercase tracking-wide text-text2 mb-2">{t('sectionLegal')}</div>
      <div className="flex flex-col gap-2 mb-6">
        {links.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 bg-surface border border-border rounded-2xl px-4 py-3.5">
            <Icon size={16} strokeWidth={2} className="text-text2 flex-shrink-0" />
            <span className="flex-1 text-sm">{label}</span>
            <ChevronRight size={16} strokeWidth={2} className="text-text2" />
          </Link>
        ))}
        <ContactSupportButton label={t('contactLink')} copiedLabel={t('contactCopied')} />
      </div>

      <LogoutButton label={t('logout')} />
    </div>
  );
}
