'use client';

import { useTranslations } from 'next-intl';
import { Rss, BookOpen, MessagesSquare, ShieldCheck } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';

export function BottomNav() {
  const t = useTranslations('app');
  const pathname = usePathname();

  const items = [
    { href: '/app', label: t('navRadar'), Icon: Rss },
    { href: '/app/guide', label: t('navGuide'), Icon: BookOpen },
    { href: '/app/community', label: t('navCommunity'), Icon: MessagesSquare },
    { href: '/app/safe', label: t('navSafe'), Icon: ShieldCheck },
  ];

  return (
    <nav className="sticky bottom-0 flex items-stretch justify-around border-t border-border bg-surface z-10">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 pb-2 text-[10px] font-semibold ${
              active ? 'text-accent2' : 'text-text2'
            }`}
          >
            <Icon size={22} strokeWidth={2} style={active ? { filter: 'drop-shadow(0 0 6px rgba(180,79,245,.6))' } : undefined} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
