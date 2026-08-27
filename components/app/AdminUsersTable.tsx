'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { setUserPlanManually } from '@/lib/admin-actions';

export type AdminUserRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  plan: string;
  status: string;
  createdAt: string;
  lastActiveDate: string | null;
};

const statusStyles: Record<string, string> = {
  active: 'bg-success/10 text-success',
  trialing: 'bg-warn/10 text-warn',
  past_due: 'bg-warn/10 text-warn',
  cancelled: 'bg-danger/10 text-danger',
  refunded: 'bg-danger/10 text-danger',
  chargeback: 'bg-danger/10 text-danger',
  free: 'bg-border text-text2',
};

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (u.email ?? '').toLowerCase().includes(q) || (u.displayName ?? '').toLowerCase().includes(q);
  });

  function toggle(u: AdminUserRow) {
    const next = u.plan === 'pro' ? 'free' : 'pro';
    setPendingId(u.id);
    startTransition(async () => {
      try {
        await setUserPlanManually(u.id, next);
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-text2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por email o nombre"
          className="w-full bg-surface border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-text2 focus:outline-none focus:border-accent2"
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm text-text2">No hay usuarios que coincidan con &quot;{query}&quot;.</div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((u) => (
          <div key={u.id} className="bg-surface border border-border rounded-2xl p-3.5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{u.displayName || u.email || 'Sin nombre'}</div>
                <div className="text-xs text-text2 truncate">{u.email}</div>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusStyles[u.status] ?? 'bg-border text-text2'}`}>
                {u.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-text2">
              <span>Alta: {new Date(u.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>Última vez: {u.lastActiveDate ? new Date(u.lastActiveDate).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '—'}</span>
            </div>
            <button
              onClick={() => toggle(u)}
              disabled={isPending && pendingId === u.id}
              className="mt-3 w-full text-xs font-bold rounded-xl py-2 border border-border text-text2 disabled:opacity-50"
            >
              {isPending && pendingId === u.id
                ? 'Aplicando…'
                : u.plan === 'pro'
                  ? 'Quitar Pro manualmente'
                  : 'Activar Pro manualmente'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
