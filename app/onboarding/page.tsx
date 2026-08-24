'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Rss } from 'lucide-react';

type Answers = {
  antiguedad?: string;
  dolor?: string;
  plataforma?: string;
  aviso?: string;
};

const STORAGE_KEY = 'kivo_onboarding_state';

const chipsAntiguedad = [
  { v: 'nuevo', label: 'Menos de 1 año' },
  { v: 'medio', label: '1 a 3 años' },
  { v: 'og', label: 'Desde el debut (2013)' },
  { v: 'perdida', label: 'Ya perdí la cuenta 💜' },
];
const chipsDolor = [
  { v: 'tickets', label: 'Preventas de tickets' },
  { v: 'comebacks', label: 'Comebacks y lives' },
  { v: 'membresia', label: 'Renovar mi membresía' },
  { v: 'todo', label: 'Honestamente... todo 😅' },
];
const chipsPlataforma = [
  { v: 'weverse', label: 'Weverse' },
  { v: 'bubble', label: 'Bubble' },
  { v: 'twitter', label: 'Twitter (X)' },
  { v: 'todas', label: 'Un poco de todas' },
];
const chipsAviso = [
  { v: 'instante', label: 'Al instante, no me quiero perder nada' },
  { v: 'resumen', label: 'Un resumen diario' },
  { v: 'urgente', label: 'Solo lo urgente' },
];

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between gap-2.5 rounded-2xl border px-4.5 py-4 text-left text-[15px] font-semibold w-full transition-transform duration-150 active:scale-[0.98] ${
        selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
      }`}
      style={selected ? { boxShadow: 'var(--glow)' } : undefined}
    >
      {label}
      <span
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-accent bg-accent' : 'border-border'
        }`}
      >
        {selected && <Check size={12} strokeWidth={3} color="white" />}
      </span>
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [loadingDone, setLoadingDone] = useState<number>(0);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.v === 1) setAnswers(parsed.respuestas ?? {});
      } catch {}
    }
  }, []);

  function saveAnswer(key: keyof Answers, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, respuestas: next }));
    setTimeout(() => setStep((s) => s + 1), 300);
  }

  function startLoading() {
    setStep(7);
    const timings = [600, 1300, 2000, 2700];
    timings.forEach((t, i) => setTimeout(() => setLoadingDone(i + 1), t));
    setTimeout(() => setStep(8), 3400);
  }

  const progressMap: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 6 };
  const progress = Math.round((progressMap[step] / 6) * 100);

  const resultText = (() => {
    switch (answers.dolor) {
      case 'tickets': return 'Como te preocupan las preventas, priorizamos alertas de tickets primero.';
      case 'comebacks': return 'Como te importan los comebacks y lives, esos van primero en tu radar.';
      case 'membresia': return 'Como te preocupa tu membresía, la vigilamos de cerca por ti.';
      default: return 'Como no te quieres perder nada, vigilamos todo el fandom por ti.';
    }
  })();

  return (
    <div className="max-w-[480px] mx-auto w-full min-h-dvh flex flex-col px-5">
      <div className="flex items-center gap-3 py-5">
        <button
          onClick={() => step > 0 && setStep(step - 1)}
          className={`text-text2 text-xl px-1 ${step === 0 ? 'invisible' : ''}`}
          aria-label="Volver"
        >
          ←
        </button>
        <div className="flex-1 h-1.5 bg-sunken rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-[width] duration-350"
            style={{ width: `${progress}%`, boxShadow: 'var(--glow)' }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-start pt-6 pb-8">
        {step === 0 && (
          <div className="flex flex-col gap-4.5">
            <div className="firma-icon w-[88px] h-[88px] rounded-full flex items-center justify-center mb-2 relative" style={{ background: 'radial-gradient(circle, var(--glow-icon), transparent 70%)' }}>
              <Rss size={40} strokeWidth={1.8} color="var(--accent2)" />
            </div>
            <div className="text-xs font-bold uppercase tracking-wide text-accent2">KIVO · 2 minutos</div>
            <h1 className="font-display text-2xl font-extrabold">Descubre qué tipo de ARMY eres</h1>
            <p className="text-sm text-text2">Responde unas preguntas rápidas y armamos tu calendario personalizado — sin genéricos, con lo que de verdad te importa a ti.</p>
            <div className="flex flex-col gap-2 text-[13px] text-text2">
              <div>✓ Toma 2 minutos</div>
              <div>✓ Tu calendario, listo al final</div>
              <div>✓ Nada de esto se cobra todavía</div>
            </div>
            <button onClick={() => setStep(1)} className="mt-1 bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 w-full transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
              Empezar →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4.5">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2">1 de 6</div>
            <h2 className="font-display text-2xl font-extrabold">¿Hace cuánto eres ARMY?</h2>
            <div className="flex flex-col gap-2.5">
              {chipsAntiguedad.map((c) => (
                <Chip key={c.v} label={c.label} selected={answers.antiguedad === c.v} onClick={() => saveAnswer('antiguedad', c.v)} />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4.5">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2">2 de 6</div>
            <h2 className="font-display text-2xl font-extrabold">¿Qué es lo que MÁS te preocupa perderte?</h2>
            <p className="text-sm text-text2 -mt-2">Sé honesto — esto define tu calendario.</p>
            <div className="flex flex-col gap-2.5">
              {chipsDolor.map((c) => (
                <Chip key={c.v} label={c.label} selected={answers.dolor === c.v} onClick={() => saveAnswer('dolor', c.v)} />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4.5">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2">No eres el único</div>
            <div className="feature-card rounded-2xl p-6">
              <div className="font-display text-4xl font-extrabold text-accent mb-2">68%</div>
              <p className="text-[15px] leading-relaxed">de los ARMY dicen que se han perdido algo importante por enterarse tarde — no es que te importe menos, es que nadie te avisa a tiempo. KIVO existe para eso.</p>
            </div>
            <button onClick={() => setStep(4)} className="bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 w-full transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
              Entiendo, sigamos →
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4.5">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2">3 de 6</div>
            <h2 className="font-display text-2xl font-extrabold">¿Cuál usas más para seguir a BTS?</h2>
            <div className="flex flex-col gap-2.5">
              {chipsPlataforma.map((c) => (
                <Chip key={c.v} label={c.label} selected={answers.plataforma === c.v} onClick={() => saveAnswer('plataforma', c.v)} />
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-4.5">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2">4 de 6</div>
            <h2 className="font-display text-2xl font-extrabold">¿Cómo prefieres que te avisemos?</h2>
            <div className="flex flex-col gap-2.5">
              {chipsAviso.map((c) => (
                <Chip key={c.v} label={c.label} selected={answers.aviso === c.v} onClick={() => saveAnswer('aviso', c.v)} />
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col gap-4.5">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2">5 de 6 · Tu meta</div>
            <h2 className="font-display text-2xl font-extrabold">Elige tu meta con KIVO</h2>
            <div className="rounded-[20px] p-6 text-center border border-accent bg-surface" style={{ boxShadow: 'var(--glow)' }}>
              <div className="text-xs font-bold uppercase tracking-wide text-accent2">Tu compromiso</div>
              <div className="font-display text-[19px] font-extrabold my-2.5">&ldquo;Nunca más perderme una preventa de BTS&rdquo;</div>
              <p className="text-sm text-text2">La vamos a proteger con alertas a tiempo — tú solo tienes que abrir KIVO cuando te avisemos.</p>
            </div>
            <button onClick={startLoading} className="bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 w-full transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
              Confirmar mi meta →
            </button>
          </div>
        )}

        {step === 7 && (
          <div className="flex flex-col items-center gap-6 text-center pt-10">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2 self-start">6 de 6</div>
            <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--sunken)" strokeWidth="8" />
              <circle
                cx="48" cy="48" r="40" fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={251} strokeDashoffset={251 * (1 - loadingDone / 4)}
                style={{ transition: 'stroke-dashoffset 400ms var(--ease-out)', filter: 'drop-shadow(0 0 6px rgba(180,79,245,.7))' }}
              />
            </svg>
            <h2 className="font-display text-lg font-extrabold">Construyendo tu calendario…</h2>
            <div className="flex flex-col gap-2.5 text-left w-full">
              {['Revisando Weverse', 'Revisando Bubble', 'Cruzando fechas de gira', 'Armando tu Radar personalizado'].map((t, i) => (
                <div key={t} className={`flex items-center gap-2.5 text-sm transition-opacity ${loadingDone > i ? 'opacity-100 text-text' : 'opacity-40 text-text2'}`}>
                  <span className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 ${loadingDone > i ? 'border-success bg-success' : 'border-border'}`}>
                    {loadingDone > i && <Check size={10} strokeWidth={3} color="white" />}
                  </span>
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="flex flex-col gap-4.5">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2">¡Listo!</div>
            <h1 className="font-display text-2xl font-extrabold">Tu Radar KIVO está armado</h1>
            <p className="text-sm text-text2 -mt-2">{resultText}</p>
            <div className="feature-card rounded-2xl p-5">
              <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-2">Próximo en tu radar</div>
              <div className="text-[17px] font-bold mb-3.5">BTS World Tour 2026 — Preventa Membresía</div>
              <div className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2.5 text-[13px]">
                🔥 Racha iniciada: día 1 de tu compromiso con KIVO
              </div>
            </div>
            <button onClick={() => router.push('/crear-cuenta')} className="bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 w-full transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
              Guardar mi Radar — crear cuenta →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
