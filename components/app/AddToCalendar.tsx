'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { googleCalendarUrl, type CalendarEvent } from '@/lib/calendar';

export function AddToCalendar({ event }: { event: CalendarEvent }) {
  const t = useTranslations('app.radar');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('addToCalendar')}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface border border-border text-text2 transition-transform duration-150 active:scale-90"
      >
        <CalendarPlus size={16} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 bg-surface border border-border rounded-2xl overflow-hidden w-48 shadow-lg">
          <a
            href={googleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3.5 py-3 text-[13px] font-semibold hover:bg-accent-soft"
            onClick={() => setOpen(false)}
          >
            {t('addGoogleCalendar')}
          </a>
          <a
            href={`/api/calendar/${event.id}`}
            className="block px-3.5 py-3 text-[13px] font-semibold border-t border-border hover:bg-accent-soft"
            onClick={() => setOpen(false)}
          >
            {t('addAppleCalendar')}
          </a>
        </div>
      )}
    </div>
  );
}
