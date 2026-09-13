'use client';

import { useState, useTransition } from 'react';
import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const LABELS: Record<string, string> = { es: 'ES', en: 'EN', fr: 'FR', ko: '한국어' };

// El revisor-visual encontró el MISMO choque (el botón flotante tapando contenido de scroll)
// en 4 pantallas distintas de /app (Community, Radar, Guide, Safe) a lo largo de varias rondas
// — no es un caso puntual, es que "flotar sobre contenido con scroll" nunca es seguro sea cual
// sea el contenido. Fix de raíz: en rutas /app este componente NO se monta (AppLayout ya tiene
// su propia fila de íconos en el header — LocaleSwitcherInline vive ahí, integrado al flujo,
// nunca flotando). Aquí solo queda la versión flotante para landing/onboarding/paywall, que no
// tienen ese header.
export function LocaleSwitcher() {
  const pathname = usePathname();
  if (pathname.startsWith('/app')) return null;
  return <LocaleSwitcherButton className="fixed right-4 bottom-4 z-40" />;
}

// Versión integrada para el header de /app (mismo tratamiento visual que los demás íconos de
// esa fila: w-9 h-9, bg-surface, border-border) — nunca flota sobre el contenido.
export function LocaleSwitcherInline() {
  return <LocaleSwitcherButton className="relative" compact />;
}

function LocaleSwitcherButton({ className, compact = false }: { className: string; compact?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function switchTo(next: string) {
    setOpen(false);
    // Si hay sesión, el cambio manual también se guarda en la cuenta — así un cambio consciente
    // de idioma persiste entre dispositivos, igual que el idioma elegido al registrarse.
    // Import diferido: este componente vive en el layout raíz (TODAS las páginas, incluida la
    // landing pública) — cargar el cliente de Supabase de entrada mete esa librería en el camino
    // crítico de gente anónima que probablemente nunca toque el selector (38-PERFORMANCE-BUDGET).
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          supabase.from('profiles').update({ locale: next }).eq('id', data.user.id);
        }
      });
    });
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className={className}>
      {open && (
        // Backdrop transparente: cierra el menú al tocar fuera (antes no existía ningún cierre
        // por click-afuera) y evita que el menú se sienta "flotando sin control" sobre el
        // contenido de la pantalla — hallazgo del revisor-visual (Safe): el desplegable se
        // solapaba con la card de abajo sin ninguna forma de descartarlo salvo elegir un idioma.
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
      )}
      {open && (
        // La versión "compact" vive arriba en el header (poco espacio libre encima) — abrir el
        // menú hacia ARRIBA (bottom-full) lo cortaba fuera del viewport (hallazgo real del
        // revisor-visual). La versión flotante sigue abriendo hacia arriba porque vive abajo.
        // Bug real reportado por el usuario: el menú no tenía z-index, así que el contenido de
        // la pantalla (el título de cada página) se pintaba ENCIMA de él — se veía como si
        // faltaran idiomas (FR/한국어) cuando en realidad estaban ahí, solo tapados.
        <div
          className={`absolute right-0 z-40 bg-surface border border-border rounded-[var(--radius-btn)] p-1.5 flex flex-col gap-0.5 shadow-lg min-w-[120px] ${
            compact ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}
        >
          {routing.locales.map((l) => (
            <button
              key={l}
              onClick={() => switchTo(l)}
              className={`text-xs font-semibold px-3 py-2 rounded-[var(--radius-btn)] text-left transition-colors ${
                l === locale ? 'bg-accent-soft text-accent2' : 'text-text2'
              }`}
            >
              {LABELS[l]}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={(e) => {
          setOpen((v) => !v);
          // El anillo de :focus-visible (globals.css) se quedaba pegado tras el tap en algunos
          // navegadores móviles — hallazgo real del revisor-visual. blur() lo limpia sin afectar
          // el foco real por teclado (focus-visible solo se dispara en navegación por teclado).
          e.currentTarget.blur();
        }}
        aria-label="Cambiar idioma"
        className={
          compact
            ? 'w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-text2 transition-transform duration-150 active:scale-95'
            : 'w-11 h-11 rounded-full bg-surface border border-border flex items-center justify-center text-text2 transition-transform duration-150 active:scale-95'
        }
        style={compact ? undefined : { boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
      >
        <Globe size={compact ? 16 : 18} strokeWidth={2} />
      </button>
    </div>
  );
}
