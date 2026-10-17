import { getTranslations } from 'next-intl/server';
import { ExternalLink } from 'lucide-react';

type Network = 'instagram' | 'tiktok' | 'facebook';

// Redes oficiales de KIVO. Se abren en pestaña nueva y sin pasar datos de la persona.
const NETWORKS: { key: Network; href: string; handle: string }[] = [
  { key: 'instagram', href: 'https://www.instagram.com/kivoapp1/', handle: '@kivoapp1' },
  { key: 'tiktok', href: 'https://www.tiktok.com/@kivoappp', handle: '@kivoappp' },
  { key: 'facebook', href: 'https://www.facebook.com/kivoappp/', handle: 'kivoappp' },
];

// lucide-react 1.x ya no trae logos de marcas: se dibujan aquí, en trazo, como el resto de íconos.
function NetworkIcon({ network, size }: { network: Network; size: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (network === 'instagram') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  if (network === 'tiktok') {
    return (
      <svg {...common}>
        <path d="M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v4.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

// Fila de íconos para el pie de la landing.
export async function SocialIcons() {
  const t = await getTranslations('social');
  const label: Record<Network, string> = { instagram: t('instagram'), tiktok: t('tiktok'), facebook: t('facebook') };
  return (
    <div className="mb-4">
      <div className="text-xs text-text2 mb-2.5">{t('title')}</div>
      <div className="flex gap-3">
        {NETWORKS.map((n) => (
          <a
            key={n.key}
            href={n.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label[n.key]}
            className="w-11 h-11 rounded-full border border-border bg-surface text-text2 flex items-center justify-center transition-transform duration-150 active:scale-95"
          >
            <NetworkIcon network={n.key} size={20} />
          </a>
        ))}
      </div>
    </div>
  );
}

// Filas con nombre y usuario para la pantalla "Tu cuenta".
export async function SocialRows() {
  const t = await getTranslations('social');
  const label: Record<Network, string> = { instagram: t('instagram'), tiktok: t('tiktok'), facebook: t('facebook') };
  return (
    <>
      <div className="text-xs font-bold uppercase tracking-wide text-text2 mb-1">{t('sectionTitle')}</div>
      <p className="text-xs text-text2 mb-2">{t('subtitle')}</p>
      <div className="flex flex-col gap-2 mb-6">
        {NETWORKS.map((n) => (
          <a
            key={n.key}
            href={n.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 surface-elevated rounded-2xl px-4 py-3.5 transition-transform duration-150 active:scale-[0.98]"
          >
            <div className="icon-chip-accent firma-icon w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
              <NetworkIcon network={n.key} size={16} />
            </div>
            <span className="flex-1 text-sm min-w-0 truncate">
              {label[n.key]} <span className="text-text2">· {n.handle}</span>
            </span>
            <ExternalLink size={16} strokeWidth={2} className="text-text2 flex-shrink-0" />
          </a>
        ))}
      </div>
    </>
  );
}
