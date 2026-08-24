import Link from 'next/link';
import { CalendarX } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Countdown } from '@/components/app/Countdown';
import { Reveal } from '@/components/app/Reveal';

function formatRelative(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'mañana';
  return `en ${days} días`;
}

const typeLabels: Record<string, string> = {
  preventa: 'Preventa',
  comeback: 'Comeback',
  membresia: 'Membresía',
  live: 'Live',
  cumpleanos: 'Cumpleaños',
  votacion: 'Votación',
};

export default async function RadarPage() {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, type, platform, starts_at')
    .order('starts_at', { ascending: true })
    .limit(10);

  if (error) {
    throw new Error('No se pudieron cargar los eventos de KIVO Radar');
  }

  const nextEvent = events?.[0];
  const restEvents = events?.slice(1) ?? [];

  const today = new Date();
  // lunes=1..sábado=6, domingo=0 -> tratar domingo como 7 para que la semana
  // siempre empiece en el lunes de ESTA semana (bug real: sin este ajuste,
  // los domingos mostraban la semana siguiente y "hoy" nunca se marcaba).
  const isoDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - isoDayOfWeek + 1 + i);
    return d;
  });
  const dayNames = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  return (
    <div>
      <Reveal>
        <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">Hola de nuevo</div>
        <h1 className="font-display text-lg font-extrabold mb-4">Tu Radar de hoy</h1>
      </Reveal>

      {nextEvent && (
        <Reveal delayMs={60}>
          <div className="feature-card rounded-2xl p-4 mb-4">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-2">Próxima {typeLabels[nextEvent.type]?.toLowerCase() ?? 'cita'}</div>
            <div className="text-base font-bold mb-3">{nextEvent.title}</div>
            <Countdown target={nextEvent.starts_at} />
            <button className="bg-accent-btn text-white font-bold text-sm rounded-xl py-2.5 w-full transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
              Ver guía paso a paso →
            </button>
          </div>
        </Reveal>
      )}

      <Reveal delayMs={120}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">
            {weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            {' – '}
            {weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
        <div className="flex gap-1.5 mb-4">
          {weekDays.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div key={i} className={`firma-icon flex-1 text-center rounded-[10px] py-2 border ${isToday ? 'bg-accent-btn border-accent-btn' : 'bg-surface border-border'}`} style={isToday ? { boxShadow: 'var(--glow)' } : undefined}>
                <div className={`text-[9px] ${isToday ? 'text-white/80' : 'text-text2'}`}>{dayNames[i]}</div>
                <div className="font-display text-sm font-bold mt-0.5">{d.getDate()}</div>
              </div>
            );
          })}
        </div>
      </Reveal>

      <Reveal delayMs={180}>
        <div className="flex flex-col gap-2.5">
          {restEvents.length === 0 && !nextEvent && (
            <div className="flex flex-col items-center text-center gap-3 py-10">
              <CalendarX size={28} color="var(--text2)" strokeWidth={1.8} />
              <div className="text-sm text-text2 max-w-[26ch]">Aún no hay eventos cargados en tu radar.</div>
              <Link href="/app/guide" className="text-accent2 text-sm font-bold underline">Explorar guías mientras tanto →</Link>
            </div>
          )}
          {restEvents.map((ev) => (
            <div key={ev.id} className="flex gap-3 items-start bg-surface border border-border rounded-2xl p-3.5">
              <div className="icon-chip-accent firma-icon w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-extrabold text-center leading-tight">
                {new Date(ev.starts_at).toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().slice(0, 3)}
                <br />{new Date(ev.starts_at).getDate()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold mb-0.5">{ev.title}</div>
                <div className="text-xs text-text2">{typeLabels[ev.type] ?? ev.type}{ev.platform ? ` · ${ev.platform}` : ''}</div>
              </div>
              <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success whitespace-nowrap">
                {formatRelative(ev.starts_at)}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delayMs={240}>
        <div className="flex items-center gap-3 bg-surface border border-border rounded-2xl p-3.5 mt-4">
          <div className="font-display text-lg font-extrabold text-accent2">12</div>
          <div className="text-xs text-text2"><b className="text-text block">Racha de trivia</b>días seguidos — sigue así</div>
        </div>
      </Reveal>
    </div>
  );
}
