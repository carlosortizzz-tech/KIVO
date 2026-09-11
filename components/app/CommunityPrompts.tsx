'use client';

import { useTranslations } from 'next-intl';
import { MessageCircleQuestion, Sparkles, Music2 } from 'lucide-react';
import type { CATEGORIES } from '@/lib/community-categories';

const PROMPTS: { category: (typeof CATEGORIES)[number]; Icon: typeof Sparkles; labelKey: string; textKey: string }[] = [
  { category: 'general', Icon: Sparkles, labelKey: 'promptGeneralLabel', textKey: 'promptGeneralText' },
  { category: 'pregunta', Icon: MessageCircleQuestion, labelKey: 'promptQuestionLabel', textKey: 'promptQuestionText' },
  { category: 'concierto', Icon: Music2, labelKey: 'promptConcertLabel', textKey: 'promptConcertText' },
];

// Solo aparece cuando el feed tiene poco volumen (community/page.tsx decide el umbral) — llena
// el vacío con una invitación real a publicar, en vez de dejar espacio muerto bajo el único post.
export function CommunityPrompts() {
  const t = useTranslations('app.community');

  function open(category: (typeof CATEGORIES)[number], text: string) {
    window.dispatchEvent(new CustomEvent('kivo:composePrompt', { detail: { category, text } }));
  }

  return (
    <div className="mt-5">
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-3">{t('promptsTitle')}</div>
      <div className="flex flex-col gap-2.5">
        {PROMPTS.map(({ category, Icon, labelKey, textKey }) => (
          <button
            key={category}
            type="button"
            onClick={() => open(category, t(textKey))}
            className="flex items-center gap-3 bg-sunken border border-border rounded-xl px-3.5 py-3 text-left transition-transform duration-150 active:scale-[0.98]"
          >
            <div className="icon-chip-accent firma-icon w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon size={16} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold mb-0.5">{t(labelKey)}</div>
              <div className="text-[12px] text-text2 truncate">{t(textKey)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
