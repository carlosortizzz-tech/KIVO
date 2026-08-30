'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

// Embed público oficial de Instagram (blockquote + su propio script) — no necesita API key ni
// token, funciona para cualquier post/reel público. El script reemplaza el blockquote por un
// iframe real al cargar; si ya estaba cargado (navegación entre pantallas de la app), solo hace
// falta pedirle que reprocese.
export function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }, [url]);

  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
      style={{ background: 'transparent', border: 0, margin: 0, width: '100%' }}
    />
  );
}
