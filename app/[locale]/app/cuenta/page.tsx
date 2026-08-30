import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { ChevronRight, ShieldCheck, FileText, RotateCcw, IdCard } from 'lucide-react';
import { LogoutButton } from '@/components/app/LogoutButton';
import { ContactSupportButton } from '@/components/app/ContactSupportButton';
import { Reveal } from '@/components/app/Reveal';
import { LevelBar } from '@/components/app/LevelBar';
import { progresoDeNivel } from '@/lib/gamification';

export default async function CuentaPage() {
  const locale = await getLocale();
  const t = await getTranslations('cuenta');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, created_at, status, trial_ends_at, plan_amount, plan_currency, streak_count, xp_total')
    .eq('id', user.id)
    .maybeSingle();

  // Gamificación (24): colección de badges — bloqueados y desbloqueados, con la barra de "te
  // faltan N" para los de racha (goal-gradient: cuanto más cerca se ve la meta, más empuja).
  const { data: allBadges } = await supabase.from('badges').select('id, code, name, description, icon').order('code');
  const { data: earned } = await supabase.from('user_badges').select('badge_id').eq('user_id', user.id);
  const earnedIds = new Set((earned ?? []).map((e) => e.badge_id));
  const streakCount = profile?.streak_count ?? 0;
  const badges = (allBadges ?? []).map((b) => {
    const unlocked = earnedIds.has(b.id);
    let progress: string | null = null;
    if (!unlocked && b.code === 'racha_7') progress = t('badgeProgress', { count: Math.max(0, 7 - streakCount) });
    if (!unlocked && b.code === 'racha_30') progress = t('badgeProgress', { count: Math.max(0, 30 - streakCount) });
    return { ...b, unlocked, progress };
  });
  // El fan veterano (sigue a BTS desde el debut) es un segmento de más edad y más poder
  // adquisitivo (30-39, ver análisis de mercado) que responde mejor a orgullo de trayectoria
  // que a mecánicas de juego — por eso este logro, cuando está desbloqueado, se destaca aparte
  // en vez de mezclarse en la grilla genérica con las rachas.
  const veteranBadge = badges.find((b) => b.code === 'og_army' && b.unlocked);
  const gridBadges = badges.filter((b) => b.code !== 'og_army' || !b.unlocked);
  const { nivel, xpEnNivel, xpParaSiguiente } = progresoDeNivel(profile?.xp_total ?? 0);
  const nivelPct = Math.min(100, Math.round((xpEnNivel / xpParaSiguiente) * 100));
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
      <Reveal>
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
      </Reveal>

      <Reveal delayMs={60}>
        <Link href="/app/cuenta/id" className="flex items-center gap-3 bg-surface border border-border rounded-2xl px-4 py-3.5 mb-6">
          <IdCard size={16} strokeWidth={2} className="text-text2 flex-shrink-0" />
          <span className="flex-1 text-sm">{t('idLink')}</span>
          <ChevronRight size={16} strokeWidth={2} className="text-text2" />
        </Link>
      </Reveal>

      <Reveal delayMs={120}>
        <div className="bg-surface border border-border rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">{t('levelLabel', { level: nivel })}</span>
            <span className="text-xs text-text2">{xpEnNivel}/{xpParaSiguiente} XP</span>
          </div>
          <LevelBar pct={nivelPct} />
        </div>
      </Reveal>

      <Reveal delayMs={180}>
        <div className="text-xs font-bold uppercase tracking-wide text-text2 mb-2">{t('sectionBadges')}</div>

        {veteranBadge && (
          <div className="feature-card rounded-2xl p-4 mb-2.5 flex items-center gap-3.5" style={{ boxShadow: 'var(--glow)' }}>
            <div className="text-3xl flex-shrink-0">{veteranBadge.icon ?? '🏆'}</div>
            <div className="flex-1">
              <div className="text-sm font-bold text-accent2 mb-0.5">{veteranBadge.name}</div>
              <div className="text-xs text-text2">{veteranBadge.description}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {gridBadges.map((b) => (
            <div key={b.id} className={`rounded-2xl p-3.5 border ${b.unlocked ? 'bg-accent/10 border-accent/30' : 'bg-surface border-border opacity-50'}`}>
              <div className="text-2xl mb-1.5">{b.icon ?? '🏆'}</div>
              <div className="text-xs font-bold mb-0.5">{b.name}</div>
              <div className="text-[11px] text-text2">{b.unlocked ? b.description : (b.progress ?? b.description)}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delayMs={240}>
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
      </Reveal>
    </div>
  );
}
