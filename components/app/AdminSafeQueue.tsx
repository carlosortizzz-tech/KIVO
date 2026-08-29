'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resolveSafeReport } from '@/lib/admin-actions';

export type SafeReportRow = {
  id: string;
  urlOrSeller: string;
  reason: string;
  reporterEmail: string | null;
  createdAt: string;
};

export function AdminSafeQueue({ reports }: { reports: SafeReportRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function resolve(id: string, status: 'verified_scam' | 'verified_safe' | 'dismissed') {
    setPendingId(id);
    startTransition(async () => {
      try { await resolveSafeReport(id, status); router.refresh(); } finally { setPendingId(null); }
    });
  }

  if (reports.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="text-sm font-bold mb-2">Reportes de KIVO Safe ({reports.length})</div>
      <div className="flex flex-col gap-2">
        {reports.map((r) => {
          const busy = isPending && pendingId === r.id;
          return (
            <div key={r.id} className="bg-surface border border-border rounded-2xl p-3.5">
              <div className="text-xs font-bold mb-1 break-words">{r.urlOrSeller}</div>
              <div className="text-xs text-text2 mb-2">
                {r.reason} · Reportado por {r.reporterEmail ?? 'usuario'} · {new Date(r.createdAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => resolve(r.id, 'verified_scam')} disabled={busy} className="flex-1 text-xs font-bold rounded-xl py-2 bg-danger/10 text-danger disabled:opacity-50">
                  Es estafa
                </button>
                <button onClick={() => resolve(r.id, 'verified_safe')} disabled={busy} className="flex-1 text-xs font-bold rounded-xl py-2 bg-success/10 text-success disabled:opacity-50">
                  Es seguro
                </button>
                <button onClick={() => resolve(r.id, 'dismissed')} disabled={busy} className="flex-1 text-xs font-bold rounded-xl py-2 border border-border text-text2 disabled:opacity-50">
                  Descartar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
