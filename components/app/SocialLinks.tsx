import { getTranslations } from 'next-intl/server';
import { AtSign, ExternalLink, Send } from 'lucide-react';

type Network = 'instagram' | 'threads' | 'tiktok' | 'facebook' | 'telegram' | 'youtube';

// Redes oficiales de KIVO. Se abren en pestaña nueva y sin pasar datos de la persona.
const NETWORKS: { key: Network; name: string; href: string; handle: string }[] = [
  { key: 'instagram', name: 'Instagram', href: 'https://www.instagram.com/kivoapp1/', handle: '@kivoapp1' },
  { key: 'threads', name: 'Threads', href: 'https://www.threads.com/@kivoapp1', handle: '@kivoapp1' },
  { key: 'tiktok', name: 'TikTok', href: 'https://www.tiktok.com/@kivoappp', handle: '@kivoappp' },
  { key: 'facebook', name: 'Facebook', href: 'https://www.facebook.com/kivoappp/', handle: 'kivoappp' },
  { key: 'telegram', name: 'Telegram', href: 'https://t.me/kivoappp', handle: '@kivoappp' },
  { key: 'youtube', name: 'YouTube', href: 'https://www.youtube.com/@KIVOAPP_YO_SOY_ARMY_BTS', handle: 'Soy Army BTS' },
];

// Colores de MARCA de cada red (no son colores de KIVO): se usan solo para que cada logo se
// reconozca a simple vista. lucide-react 1.x ya no trae logos de marcas, por eso se dibujan aquí.
const BRAND_BACKGROUND: Record<Network, string> = {
  instagram: 'var(--brand-instagram)',
  threads: 'var(--brand-threads)',
  tiktok: 'var(--brand-tiktok)',
  facebook: 'var(--brand-facebook)',
  telegram: 'var(--brand-telegram)',
  youtube: 'var(--brand-youtube)',
};

function Glyph({ network, size }: { network: Network; size: number }) {
  const stroke = {
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
      <svg {...stroke}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  if (network === 'threads') {
    return <AtSign size={size} strokeWidth={2} aria-hidden />;
  }
  if (network === 'tiktok') {
    return (
      <svg {...stroke}>
        <path d="M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v4.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917z" />
      </svg>
    );
  }
  if (network === 'telegram') {
    return <Send size={size} strokeWidth={2} aria-hidden />;
  }
  if (network === 'youtube') {
    return (
      <svg {...stroke}>
        <path d="M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.7V3.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.7V13h2.7v8h3.1z" />
    </svg>
  );
}

// Logo de la red: cuadrado de color de marca con su símbolo en blanco.
function BrandLogo({ network, box, glyph }: { network: Network; box: number; glyph: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-xl flex-shrink-0 text-white"
      style={{ width: box, height: box, background: BRAND_BACKGROUND[network] }}
    >
      <Glyph network={network} size={glyph} />
    </span>
  );
}

// Fila de logos para el pie de la landing.
export async function SocialIcons() {
  const t = await getTranslations('social');
  const label: Record<Network, string> = { instagram: t('instagram'), threads: t('threads'), tiktok: t('tiktok'), facebook: t('facebook'), telegram: t('telegram'), youtube: t('youtube') };
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
            className="block transition-transform duration-150 active:scale-95"
          >
            <BrandLogo network={n.key} box={44} glyph={22} />
          </a>
        ))}
      </div>
    </div>
  );
}

// Filas con logo, nombre y usuario para la pantalla "Tu cuenta".
export async function SocialRows() {
  const t = await getTranslations('social');
  const label: Record<Network, string> = { instagram: t('instagram'), threads: t('threads'), tiktok: t('tiktok'), facebook: t('facebook'), telegram: t('telegram'), youtube: t('youtube') };
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
            <BrandLogo network={n.key} box={36} glyph={18} />
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

// Tarjeta para la pestaña Comunidad: 6 logos grandes con el nombre de la red debajo.
export async function SocialCard() {
  const t = await getTranslations('social');
  return (
    <div className="feature-card rounded-[var(--radius-card)] p-4 mb-4">
      <div className="text-sm font-bold mb-0.5">{t('cardTitle')}</div>
      <p className="text-xs text-text2 mb-3">{t('subtitle')}</p>
      <div className="grid grid-cols-3 gap-x-2 gap-y-3">
        {NETWORKS.map((n) => (
          <a
            key={n.key}
            href={n.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-1 transition-transform duration-150 active:scale-95"
          >
            <BrandLogo network={n.key} box={48} glyph={24} />
            <span className="text-xs text-text2">{n.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
