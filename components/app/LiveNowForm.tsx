'use client';

import { useState } from 'react';
import { Radio } from 'lucide-react';

export function LiveNowForm() {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sentCount, setSentCount] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/admin/live-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setSentCount(data.sent ?? 0);
      setStatus('sent');
      setTitle('');
      setUrl('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="text-xs font-semibold text-text2 mb-1.5 block">Qué está en vivo</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: RM está en vivo en Weverse"
          className="w-full bg-surface border border-border rounded-2xl px-3.5 py-3 text-sm"
          disabled={status === 'sending'}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-text2 mb-1.5 block">Link (opcional)</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://weverse.io/..."
          className="w-full bg-surface border border-border rounded-2xl px-3.5 py-3 text-sm"
          disabled={status === 'sending'}
        />
      </div>
      <button
        type="submit"
        disabled={status === 'sending' || !title.trim()}
        className="flex items-center justify-center gap-2 bg-accent-btn text-white font-bold text-[13px] rounded-xl py-3 disabled:opacity-50"
        style={{ boxShadow: 'var(--glow)' }}
      >
        <Radio size={16} strokeWidth={2} />
        {status === 'sending' ? 'Enviando…' : 'Avisar a todos los Pro ahora'}
      </button>
      {status === 'sent' && (
        <p className="text-[13px] text-success text-center">✓ Aviso enviado a {sentCount} usuarios Pro</p>
      )}
      {status === 'error' && (
        <p className="text-[13px] text-warn text-center">No se pudo enviar — intenta de nuevo.</p>
      )}
    </form>
  );
}
