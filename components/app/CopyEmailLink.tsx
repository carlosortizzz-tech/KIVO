'use client';

import { useState } from 'react';

const SUPPORT_EMAIL = 'soporte@kivoapp.app';

// Nunca usar <a href="mailto:">: si el dispositivo no tiene cliente de correo configurado, el
// navegador puede caer en la página del proveedor de correo del dominio y sacar al usuario de
// la app/landing por completo (pasó en producción). Copiar al portapapeles es 100% confiable.
export function CopyEmailLink({ label, copiedLabel, className }: { label: string; copiedLabel: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    } catch {}
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {copied ? copiedLabel : label}
    </button>
  );
}
