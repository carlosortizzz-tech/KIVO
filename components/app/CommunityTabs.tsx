'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export function CommunityTabs({ feed, experiences }: { feed: ReactNode; experiences: ReactNode }) {
  const t = useTranslations('app.community');
  const [tab, setTab] = useState<'feed' | 'experiences'>('feed');

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('feed')}
          className={`flex-1 text-[13px] font-bold rounded-xl py-2.5 border ${tab === 'feed' ? 'bg-accent-soft border-accent text-accent2' : 'bg-surface border-border text-text2'}`}
        >
          {t('tabFeed')}
        </button>
        <button
          onClick={() => setTab('experiences')}
          className={`flex-1 text-[13px] font-bold rounded-xl py-2.5 border ${tab === 'experiences' ? 'bg-accent-soft border-accent text-accent2' : 'bg-surface border-border text-text2'}`}
        >
          {t('tabExperiences')}
        </button>
      </div>
      {tab === 'feed' ? feed : experiences}
    </div>
  );
}
