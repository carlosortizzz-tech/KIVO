'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Check, TriangleAlert } from 'lucide-react';
import { approveNewsDraft, rejectNewsDraft } from '@/lib/admin-actions';

export type NewsDraftRow = {
  id: string;
  headline: string;
  summary: string;
  sources: { name: string; url: string }[];
  missingLangs: string[];
  notes: string | null;
  createdAt: string;
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function AdminNewsDrafts({ drafts }: { drafts: NewsDraftRow[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(id: string, action: (id: string) => Promise<void>) {
    setBusyId(id);
    setErrors((prev) => ({ ...prev, [id]: '' }));
    startTransition(async () => {
      try {
        await action(id);
        setConfirmId(null);
        router.refresh();
      } catch (e) {
        setErrors((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : 'No se pudo completar. Intenta de nuevo.' }));
      } finally {
        setBusyId(null);
      }
    });
  }

  if (drafts.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 text-center">
        <div className="icon-chip-accent firma-icon w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Check size={20} strokeWidth={2} />
        </div>
        <div className="text-sm font-bold mb-1">Todo al día</div>
        <p className="text-xs text-text2 max-w-[32ch] mx-auto">
          No hay noticias esperando tu aprobación. Cuando llegue una nueva, te aviso por Telegram.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {drafts.map((d) => {
        const busy = isPending && busyId === d.id;
        const confirming = confirmId === d.id;
        const blocked = d.missingLangs.length > 0;
        return (
          <div key={d.id} className="bg-surface border border-border rounded-2xl p-4">
            <div className="text-xs text-text2 mb-1.5">
              {new Date(d.createdAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-base font-bold leading-snug mb-1.5 break-words">{d.headline}</div>
            <p className="text-sm text-text2 leading-relaxed mb-3 break-words">{d.summary}</p>

            <div className="text-xs font-bold uppercase tracking-wide text-text2 mb-1.5">Fuentes (abre y confirma)</div>
            <div className="flex flex-col gap-1.5 mb-3">
              {d.sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 text-xs bg-sunken rounded-xl px-3 py-2.5 min-h-11"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-text truncate">{s.name}</span>
                    <span className="block text-text2 truncate">{hostOf(s.url)}</span>
                  </span>
                  <ExternalLink size={14} strokeWidth={2} className="flex-shrink-0 text-accent2" />
                </a>
              ))}
            </div>

            {d.notes && <p className="text-xs text-text2 mb-3 break-words">Nota de verificación: {d.notes}</p>}

            {blocked && (
              <div className="flex items-start gap-2 bg-warn/10 border border-warn/30 rounded-xl p-2.5 mb-3">
                <TriangleAlert size={14} strokeWidth={2} className="text-warn flex-shrink-0 mt-0.5" />
                <div className="text-xs text-text">Falta la traducción ({d.missingLangs.join(', ').toUpperCase()}). No se puede publicar así.</div>
              </div>
            )}

            {errors[d.id] && (
              <div role="alert" className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-xl p-2.5 mb-3">
                <TriangleAlert size={14} strokeWidth={2} className="text-danger flex-shrink-0 mt-0.5" />
                <div className="text-xs text-text">{errors[d.id]}</div>
              </div>
            )}

            {confirming ? (
              <div className="flex gap-2">
                <button
                  onClick={() => run(d.id, approveNewsDraft)}
                  disabled={busy}
                  className="flex-1 text-sm font-bold rounded-xl min-h-11 bg-accent-btn text-white disabled:opacity-50 transition-transform duration-150 active:scale-[0.97]"
                >
                  {busy ? 'Publicando…' : 'Sí, publicar ahora'}
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  disabled={busy}
                  className="text-sm font-bold rounded-xl min-h-11 px-4 border border-border text-text2 disabled:opacity-50"
                >
                  Volver
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmId(d.id)}
                  disabled={busy || blocked}
                  className="flex-1 text-sm font-bold rounded-xl min-h-11 bg-accent-btn text-white disabled:opacity-40 transition-transform duration-150 active:scale-[0.97]"
                >
                  Publicar
                </button>
                <button
                  onClick={() => run(d.id, rejectNewsDraft)}
                  disabled={busy}
                  className="text-sm font-bold rounded-xl min-h-11 px-4 border border-border text-text2 disabled:opacity-50"
                >
                  {busy ? 'Descartando…' : 'Descartar'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
