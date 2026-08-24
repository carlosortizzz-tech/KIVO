'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Rss, BookOpen, MessagesSquare, ShieldCheck } from 'lucide-react';

const items = [
  { href: '/app', label: 'Radar', Icon: Rss },
  { href: '/app/guide', label: 'Guide', Icon: BookOpen },
  { href: '/app/community', label: 'Community', Icon: MessagesSquare },
  { href: '/app/safe', label: 'Safe', Icon: ShieldCheck },
];

export function BottomNav() {
  const pathname = usePathname();
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
