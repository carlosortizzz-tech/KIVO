import { ShieldAlert, ShieldCheck, Flag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Reveal } from '@/components/app/Reveal';

export default async function SafePage() {
  const supabase = await createClient();
  const { data: reports, error } = await supabase
    .from('safe_reports')
    .select('id, url_or_seller, reason, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    throw new Error('No se pudo cargar KIVO Safe');
  }

  return (
    <div>
      <Reveal>
        <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">Confianza</div>
        <h1 className="font-display text-lg font-extrabold mb-4">KIVO Safe</h1>

        <div className="feature-card flex items-center gap-3.5 rounded-2xl p-4 mb-4">
          <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90 flex-shrink-0">
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--sunken)" strokeWidth="6" />
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--success)" strokeWidth="6" strokeLinecap="round" strokeDasharray="151" strokeDashoffset="23" />
          </svg>
          <div>
            <div className="font-display text-[26px] font-extrabold leading-none">85<span className="text-sm text-text2 font-medium">/100</span></div>
            <div className="text-xs text-text2 mt-1">Nivel de confianza de tus fuentes esta semana</div>
          </div>
        </div>
      </Reveal>

      {reports && reports.length > 0 ? (
        <div className="flex flex-col gap-2.5 mb-5">
          {reports.map((r, i) => {
            const danger = r.status !== 'verified_safe';
            return (
              <Reveal key={r.id} delayMs={80 + i * 60}>
                <div className="flex gap-3 items-start bg-surface border border-border rounded-2xl p-3.5">
                  <div className={`firma-icon w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${danger ? 'bg-danger/15' : 'bg-success/15'}`}>
                    {danger ? <ShieldAlert size={18} color="var(--danger)" strokeWidth={2} /> : <ShieldCheck size={18} color="var(--success)" strokeWidth={2} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{r.url_or_seller}</div>
                    <div className="text-xs text-text2 mt-0.5">{r.reason}</div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      ) : (
        <Reveal delayMs={80}>
          <div className="flex flex-col items-center text-center gap-2.5 py-8 mb-5">
            <ShieldCheck size={28} color="var(--success)" strokeWidth={1.8} />
            <div className="text-sm font-bold">Sin alertas activas</div>
            <p className="text-sm text-text2 max-w-[26ch]">Ningún reporte de estafa confirmado esta semana.</p>
          </div>
        </Reveal>
      )}

      <Reveal delayMs={160}>
        <button className="flex items-center justify-center gap-2 bg-surface border border-dashed border-border text-text2 text-sm font-semibold rounded-2xl py-3.5 w-full mb-6 transition-transform duration-150 active:scale-[0.98]">
          <Flag size={16} strokeWidth={2} /> Reportar un enlace o vendedor sospechoso
        </button>

        <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-3">Reglas de oro</div>
        <div className="flex flex-col gap-2.5">
          {[
            'Nunca pagues por transferencia directa a una persona sin reputación verificada.',
            'Los canales oficiales de HYBE nunca piden datos de tu tarjeta por DM.',
            'Si el precio "parece muy bueno para ser cierto", repórtalo antes de pagar.',
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-text2 leading-relaxed">
              <span className="firma-icon w-5 h-5 rounded-full bg-accent-soft text-accent2 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              {t}
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
