import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ProGate } from '@/components/app/ProGate';
import { getUserPlan } from '@/lib/plan';
import { SafeReportForm } from '@/components/app/SafeReportForm';
import { TrustScoreRing } from '@/components/app/TrustScoreRing';
import { Reveal } from '@/components/app/Reveal';

export default async function SafePage() {
  const t = await getTranslations('app.safe');
  const plan = await getUserPlan();
  if (plan !== 'pro') return <ProGate feature={t('eyebrow')} type="safe" />;
  const supabase = await createClient();
  // Las "alertas" son reportes de la comunidad ya CONFIRMADOS como estafa (status='verified_scam')
  // — antes esto apuntaba a una tabla "scam_alerts" que nunca existió en la base de datos, así que
  // esta pantalla tiraba error para todo el mundo. safe_reports ya tenía todo lo necesario.
  const { data: alerts } = await supabase
    .from('safe_reports')
    .select('id, url_or_seller, reason, created_at')
    .eq('status', 'verified_scam')
    .order('created_at', { ascending: false })
    .limit(10);

  // Puntaje de confianza REAL (antes era un "85/100" fijo, decorativo — no se inventa un número).
  // Fórmula honesta y simple: 100 menos 15 puntos por cada estafa CONFIRMADA en los últimos 7
  // días, piso en 0. Cero estafas confirmadas esta semana = 100 ("todo tranquilo").
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: scamsThisWeek } = await supabase
    .from('safe_reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'verified_scam')
    .gte('created_at', weekAgo);
  const trustScore = Math.max(0, 100 - (scamsThisWeek ?? 0) * 15);

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">{t('eyebrow')}</div>
      <h1 className="font-display text-2xl font-extrabold mb-4 tracking-tight">{t('title')}</h1>

      <Reveal>
        <div className="feature-card rounded-[var(--radius-card)] p-4 mb-4 flex items-center gap-4">
          <TrustScoreRing score={trustScore} />
          <div>
            <div className="text-sm font-bold">{t('scoreLabel')}</div>
            <div className="text-xs text-text2 mt-0.5">{trustScore}/100</div>
          </div>
        </div>
      </Reveal>

      {alerts && alerts.length > 0 ? (
        <div className="flex flex-col gap-2.5 mb-4">
          {alerts.map((a, i) => (
            <Reveal key={a.id} delayMs={60 + i * 50}>
              <div className="flex gap-3 items-start surface-elevated rounded-[var(--radius-card)] p-3.5">
                <div className="w-9 h-9 rounded-[var(--radius-btn)] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(224,82,82,.12)' }}>
                  <AlertTriangle size={18} color="var(--danger)" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-bold mb-0.5">{a.url_or_seller}</div>
                  <div className="text-xs text-text2">{a.reason}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      ) : (
        <Reveal delayMs={60}>
          <div className="flex flex-col items-center text-center gap-2 py-8 px-4 mb-4">
            <ShieldCheck size={28} color="var(--success)" strokeWidth={1.8} />
            <div className="text-sm font-bold">{t('noAlertsTitle')}</div>
            <p className="text-[13px] text-text2 max-w-[26ch]">{t('noAlertsBody')}</p>
          </div>
        </Reveal>
      )}

      <Reveal delayMs={120}>
        <SafeReportForm />
      </Reveal>

      <Reveal delayMs={180}>
        <div className="surface-elevated rounded-[var(--radius-card)] p-4">
          <div className="text-sm font-bold mb-2.5">{t('rulesTitle')}</div>
          <ul className="flex flex-col gap-2 text-[13px] text-text2">
            <li className="flex gap-2"><span className="text-accent2 font-bold">1.</span>{t('rule1')}</li>
            <li className="flex gap-2"><span className="text-accent2 font-bold">2.</span>{t('rule2')}</li>
            <li className="flex gap-2"><span className="text-accent2 font-bold">3.</span>{t('rule3')}</li>
          </ul>
        </div>
      </Reveal>
    </div>
  );
}
