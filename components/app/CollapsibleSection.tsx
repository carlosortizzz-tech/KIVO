'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// Mismo patrón visual que GuideList.tsx (acordeón) — reutilizable para cualquier bloque de
// contenido de la pantalla Guide (noticias, calendario, videos), así las 5 secciones se sienten
// como una sola lista consistente en vez de bloques con estilos distintos.
export function CollapsibleSection({
  title,
  icon,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-2.5">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-2.5 p-3.5 w-full text-left transition-transform duration-150 active:scale-[0.98]"
      >
        <div className="icon-chip-accent firma-icon w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 text-sm font-bold">
          {title}
          {typeof count === 'number' && <span className="text-text2 font-semibold"> ({count})</span>}
        </div>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="text-text2 flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <div className="px-3.5 pb-4 pt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
