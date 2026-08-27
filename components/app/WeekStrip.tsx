'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

export function WeekStrip({ locale, concertDates }: { locale: string; concertDates: string[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  // 'en-CA' da YYYY-MM-DD en hora LOCAL del navegador — coherente con d.getDate() de abajo.
  const concertSet = new Set(concertDates.map((iso) => new Date(iso).toLocaleDateString('en-CA')));

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
          const isToday = d.toDateString() === today.toDateString();
          const hasConcert = concertSet.has(toDateKey(d));
          const dayName = d.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2);
          return (
            <div
              key={i}
              className={`relative flex-1 text-center rounded-[10px] py-2 border ${isToday ? 'bg-accent-btn border-accent-btn' : 'bg-surface border-border'}`}
              style={isToday ? { boxShadow: 'var(--glow)' } : undefined}
            >
              {hasConcert && (
                <Star size={10} strokeWidth={0} fill="var(--warn)" className="absolute top-1 right-1" />
              )}
              <div className={`text-[9px] ${isToday ? 'text-white/80' : 'text-text2'}`}>{dayName}</div>
              <div className="font-display text-[13px] font-bold mt-0.5">{d.getDate()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
