'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ShieldQuestion, Rss, Ticket, BookOpenText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/app/Reveal';

const iconMap: Record<string, typeof Rss> = {
  Weverse: BookOpenText,
  Bubble: ShieldQuestion,
  'Weverse Live': Rss,
  Ticketing: Ticket,
};

export type GuideRow = {
  id: string;
  title: string;
  category: string;
  platform: string;
  read_minutes: number;
  steps: string[];
};

export function GuideList({ guides, openPlatform }: { guides: GuideRow[]; openPlatform?: string }) {
  const t = useTranslations('app.guide');
  const preselected = openPlatform ? guides.find((g) => g.platform === openPlatform)?.id ?? null : null;
  const [openId, setOpenId] = useState<string | null>(preselected);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Si se llegó con ?platform=X desde la tarjeta de "próximo evento" de Radar, la guía
  // correspondiente ya nace abierta (arriba) — esto solo hace scroll hasta ella para que no
  // quede fuera de la vista debajo de Noticias/Calendario.
  useEffect(() => {
    if (preselected && cardRefs.current[preselected]) {
      cardRefs.current[preselected]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2.5">
      {guides.map((g, i) => {
        const Icon = iconMap[g.platform] ?? BookOpenText;
        const open = openId === g.id;
        return (
          <Reveal key={g.id} delayMs={80 + i * 60}>
            <div ref={(el) => { cardRefs.current[g.id] = el; }} className="bg-surface border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : g.id)}
                aria-expanded={open}
                className="icon-chip-accent-row flex items-center gap-3 p-3.5 w-full text-left transition-transform duration-150 active:scale-[0.98]"
              >
                <div className="icon-chip-accent firma-icon w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{g.title}</div>
                  <div className="text-xs text-text2 mt-0.5">{g.category}</div>
                </div>
                <div className="text-[11px] text-text2 whitespace-nowrap">{t('minutes', { count: g.read_minutes })}</div>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className="text-text2 flex-shrink-0 transition-transform duration-200"
                  style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300"
                style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div className="px-3.5 pb-4 pt-1">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-text2 mb-2">{t('stepsLabel')}</div>
                    <ol className="flex flex-col gap-2">
                      {g.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/15 text-accent2 text-[11px] font-bold flex items-center justify-center mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-text2">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
