'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export function CommunityTabs({ feed, experiences }: { feed: ReactNode; experiences: ReactNode }) {
  const t = useTranslations('app.community');
  const [tab, setTab] = useState<'feed' | 'experiences'>('feed');
  const [faded, setFaded] = useState(true);

  useEffect(() => {
    setFaded(false);
    const id = requestAnimationFrame(() => setFaded(true));
    return () => cancelAnimationFrame(id);
  }, [tab]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('feed')}
          className={`flex-1 text-[13px] font-bold rounded-xl py-2.5 border transition-transform duration-150 active:scale-[0.98] ${tab === 'feed' ? 'bg-accent-soft border-accent text-accent2' : 'bg-surface border-border text-text2'}`}
        >
          {t('tabFeed')}
        </button>
        <button
          onClick={() => setTab('experiences')}
          className={`flex-1 text-[13px] font-bold rounded-xl py-2.5 border transition-transform duration-150 active:scale-[0.98] ${tab === 'experiences' ? 'bg-accent-soft border-accent text-accent2' : 'bg-surface border-border text-text2'}`}
        >
          {t('tabExperiences')}
        </button>
      </div>
      <div key={tab} className={`transition-opacity duration-250 ease-out ${faded ? 'opacity-100' : 'opacity-0'}`}>
        {tab === 'feed' ? feed : experiences}
      </div>
    </div>
  );
}
