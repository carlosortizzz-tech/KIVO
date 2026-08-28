'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { dismissReport, removeReportedContent } from '@/lib/admin-actions';

export type ReportRow = {
  id: string;
  targetId: string;
  reason: string;
  reporterEmail: string | null;
  createdAt: string;
};

export function AdminReportsQueue({ reports }: { reports: ReportRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function dismiss(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try { await dismissReport(id); router.refresh(); } finally { setPendingId(null); }
    });
  }

  function remove(id: string, targetId: string) {
    setPendingId(id);
    startTransition(async () => {
      try { await removeReportedContent(id, targetId); router.refresh(); } finally { setPendingId(null); }
    });
  }

  if (reports.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="text-sm font-bold mb-2">Reportes de la comunidad ({reports.length})</div>
      <div className="flex flex-col gap-2">
        {reports.map((r) => {
          const busy = isPending && pendingId === r.id;
          return (
            <div key={r.id} className="bg-surface border border-border rounded-2xl p-3.5">
              <div className="text-xs text-text2 mb-2">
                Reportado por {r.reporterEmail ?? 'usuario'} · {new Date(r.createdAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => remove(r.id, r.targetId)} disabled={busy} className="flex-1 text-xs font-bold rounded-xl py-2 bg-danger/10 text-danger disabled:opacity-50">
                  Eliminar publicación
                </button>
                <button onClick={() => dismiss(r.id)} disabled={busy} className="flex-1 text-xs font-bold rounded-xl py-2 border border-border text-text2 disabled:opacity-50">
                  Descartar reporte
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
