'use client';

import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

// Embed público oficial de Instagram (blockquote + su propio script) — no necesita API key ni
// token, funciona para cualquier post/reel público. El script reemplaza el blockquote por un
// iframe real al cargar; si ya estaba cargado (navegación entre pantallas de la app), solo hace
// falta pedirle que reprocese.
//
// Carga SOLO tras un toque: al cargar, Instagram recibe datos del navegador (como la IP), y la
// política de privacidad lo explica — por eso no se contacta a Instagram hasta que la persona lo pide.
export function InstagramEmbed({ url }: { url: string }) {
  const t = useTranslations('app.radar');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }, [loaded, url]);

  if (!loaded) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="flex items-center gap-2 bg-accent-btn text-white font-bold text-sm rounded-[var(--radius-btn)] px-6 py-3 transition-transform duration-150 active:scale-[0.97]"
        >
          <Play size={16} strokeWidth={2.5} />
          {t('instagramPlay')}
        </button>
        <p className="text-xs text-text2 leading-relaxed max-w-xs">{t('instagramNote')}</p>
      </div>
    );
  }

  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
      style={{ background: 'transparent', border: 0, margin: 0, width: '100%' }}
    />
  );
}
