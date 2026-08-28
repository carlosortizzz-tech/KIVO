import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ProGate } from '@/components/app/ProGate';
import { getUserPlan } from '@/lib/plan';
import { SafeReportForm } from '@/components/app/SafeReportForm';

export default async function SafePage() {
  const t = await getTranslations('app.safe');
  const plan = await getUserPlan();
  if (plan !== 'pro') return <ProGate feature={t('eyebrow')} />;
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

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">{t('eyebrow')}</div>
      <h1 className="font-display text-lg font-extrabold mb-4">{t('title')}</h1>

      <div className="feature-card rounded-2xl p-4 mb-4 flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="28" fill="none" stroke="var(--success)" strokeWidth="6"
              strokeDasharray={2 * Math.PI * 28}
              strokeDashoffset={2 * Math.PI * 28 * (1 - 0.85)}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-display text-sm font-extrabold">85</div>
        </div>
        <div>
          <div className="text-sm font-bold">{t('scoreLabel')}</div>
          <div className="text-xs text-text2 mt-0.5">85/100</div>
        </div>
      </div>

      {alerts && alerts.length > 0 ? (
        <div className="flex flex-col gap-2.5 mb-4">
          {alerts.map((a) => (
            <div key={a.id} className="flex gap-3 items-start bg-surface border border-border rounded-2xl p-3.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,.12)' }}>
                <AlertTriangle size={18} color="#EF4444" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold mb-0.5">{a.url_or_seller}</div>
                <div className="text-xs text-text2">{a.reason}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center gap-2 py-8 px-4 mb-4">
          <ShieldCheck size={28} color="var(--success)" strokeWidth={1.8} />
          <div className="text-sm font-bold">{t('noAlertsTitle')}</div>
          <p className="text-[13px] text-text2 max-w-[26ch]">{t('noAlertsBody')}</p>
        </div>
      )}

      <SafeReportForm />

      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="text-sm font-bold mb-2.5">{t('rulesTitle')}</div>
        <ul className="flex flex-col gap-2 text-[13px] text-text2">
          <li className="flex gap-2"><span className="text-accent2 font-bold">1.</span>{t('rule1')}</li>
          <li className="flex gap-2"><span className="text-accent2 font-bold">2.</span>{t('rule2')}</li>
          <li className="flex gap-2"><span className="text-accent2 font-bold">3.</span>{t('rule3')}</li>
        </ul>
      </div>
    </div>
  );
}
