'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

type ConcertDate = { startsAt: string; venue: string | null };

export function WeekStrip({ locale, concertDates }: { locale: string; concertDates: ConcertDate[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // 'en-CA' da YYYY-MM-DD en hora LOCAL del navegador — coherente con d.getDate() de abajo.
  const concertByDate = new Map(
    concertDates.map((c) => [new Date(c.startsAt).toLocaleDateString('en-CA'), c.venue])
  );

  const today = new Date();
  const isoDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - isoDayOfWeek + 1 + i + weekOffset * 7);
    return d;
  });

  function toDateKey(d: Date) {
    return d.toLocaleDateString('en-CA');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="Semana anterior"
          className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-text2 transition-transform duration-150 active:scale-90"
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <div className="text-[13px] font-semibold">
          {weekDays[0].toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
          {' – '}
          {weekDays[6].toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          aria-label="Semana siguiente"
          className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-text2 transition-transform duration-150 active:scale-90"
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
      <div className="flex gap-1.5 mb-4">
        {weekDays.map((d, i) => {
          const dateKey = toDateKey(d);
          const isToday = d.toDateString() === today.toDateString();
          const venue = concertByDate.get(dateKey);
          const hasConcert = venue !== undefined;
          const dayName = d.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2);
          const isActive = activeKey === dateKey;
          return (
            <div
              key={i}
              className={`relative flex-1 text-center rounded-[10px] py-2 border select-none ${isToday ? 'bg-accent-btn border-accent-btn' : 'bg-surface border-border'}`}
              style={isToday ? { boxShadow: 'var(--glow)' } : undefined}
              onPointerDown={hasConcert ? () => setActiveKey(dateKey) : undefined}
              onPointerUp={hasConcert ? () => setActiveKey(null) : undefined}
              onPointerLeave={hasConcert ? () => setActiveKey(null) : undefined}
              onPointerCancel={hasConcert ? () => setActiveKey(null) : undefined}
            >
              {hasConcert && (
                <Star size={10} strokeWidth={0} fill="var(--warn)" className="absolute top-1 right-1" />
              )}
              <div className={`text-[9px] ${isToday ? 'text-white/80' : 'text-text2'}`}>{dayName}</div>
              <div className="font-display text-[13px] font-bold mt-0.5">{d.getDate()}</div>
              {isActive && venue && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-text text-bg text-[11px] font-semibold whitespace-nowrap z-10 pointer-events-none">
                  {venue}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
