'use client';

import { useState, useTransition } from 'react';
import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const LABELS: Record<string, string> = { es: 'ES', en: 'EN', fr: 'FR', ko: '한국어' };

export function LocaleSwitcher() {
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
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 bg-surface border border-border rounded-2xl p-1.5 flex flex-col gap-0.5 shadow-lg">
          {routing.locales.map((l) => (
            <button
              key={l}
              onClick={() => switchTo(l)}
              className={`text-xs font-semibold px-3 py-2 rounded-xl text-left transition-colors ${
                l === locale ? 'bg-accent-soft text-accent2' : 'text-text2'
              }`}
            >
              {LABELS[l]}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Cambiar idioma"
        className="w-11 h-11 rounded-full bg-surface border border-border flex items-center justify-center text-text2 transition-transform duration-150 active:scale-95"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
      >
        <Globe size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
