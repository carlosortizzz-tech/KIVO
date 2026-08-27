'use client';

import { useState } from 'react';
import { Mail, ChevronRight, Check } from 'lucide-react';

const SUPPORT_EMAIL = 'soporte@kivoapp.app';

export function ContactSupportButton({ label, copiedLabel }: { label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    // SOLO copiar — nunca navegar con window.location a un mailto: cuando no hay cliente de
    // correo configurado, el navegador puede caer en una página ajena (ej. la del proveedor de
    // correo del dominio) y sacar al usuario de la app por completo. Copiar es 100% confiable.
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    } catch {}
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
