'use client';

import { useState } from 'react';
import { Mail, ChevronRight, Check } from 'lucide-react';

const SUPPORT_EMAIL = 'soporte@kivoapp.app';

export function ContactSupportButton({ label, copiedLabel }: { label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    // El mailto abre la app de correo si hay una configurada; si el dispositivo/navegador
    // no tiene ninguna (muy común en celular), no pasa NADA visible — por eso copiamos el
    // correo también, así el usuario SIEMPRE tiene una acción con feedback real (regla UX 4/11).
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
    window.location.href = `mailto:${SUPPORT_EMAIL}`;
  }

  return (
    <button
      onClick={handleClick}
      type="button"
      className="flex items-center gap-3 bg-surface border border-border rounded-2xl px-4 py-3.5 w-full text-left"
    >
      {copied ? (
        <Check size={16} strokeWidth={2} className="text-success flex-shrink-0" />
      ) : (
        <Mail size={16} strokeWidth={2} className="text-text2 flex-shrink-0" />
      )}
      <span className="flex-1 text-sm">
        {copied ? copiedLabel : label}
        {copied && <span className="block text-xs text-text2 mt-0.5">{SUPPORT_EMAIL}</span>}
      </span>
      {!copied && <ChevronRight size={16} strokeWidth={2} className="text-text2" />}
    </button>
  );
}
