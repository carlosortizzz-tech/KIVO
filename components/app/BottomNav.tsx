'use client';

import { useTranslations } from 'next-intl';
import { Rss, BookOpen, MessagesSquare, ShieldCheck } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';

export function BottomNav({ plan }: { plan: 'free' | 'pro' }) {
  const t = useTranslations('app');
  const pathname = usePathname();

  const items = [
    { href: '/app', label: t('navRadar'), Icon: Rss, pro: false },
    { href: '/app/guide', label: t('navGuide'), Icon: BookOpen, pro: true },
    { href: '/app/community', label: t('navCommunity'), Icon: MessagesSquare, pro: true },
    { href: '/app/safe', label: t('navSafe'), Icon: ShieldCheck, pro: true },
  ];

  return (
    <nav
      className="sticky bottom-0 flex items-stretch justify-around border-t border-border bg-surface z-10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map(({ href, label, Icon, pro }) => {
        const active = pathname === href;
        const locked = pro && plan !== 'pro';
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold whitespace-nowrap ${
              active ? 'text-accent2' : 'text-text2'
            }`}
          >
            <Icon size={22} strokeWidth={2} style={active ? { filter: 'drop-shadow(0 0 6px rgba(180,79,245,.6))' } : undefined} />
            {label}
            {locked && (
              <span className="absolute top-1 right-2 bg-accent-btn text-white text-[8px] font-bold leading-none px-1 py-0.5 rounded-full">
                PRO
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
