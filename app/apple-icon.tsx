import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Mismo diseño que app/icon.tsx (la K con borde neón), a 180×180 — el tamaño que iOS pide para el
// ícono cuando alguien agrega KIVO a su pantalla de inicio ("apple-touch-icon"). Hex directo a
// propósito: Satori (next/og) no carga globals.css ni resuelve var(--...).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B0710',
          border: '10px solid #B44FF5',
          boxShadow: '0 0 40px 8px #B44FF5',
        }}
      >
        <span
          style={{
            fontSize: 108,
            fontWeight: 800,
            color: '#B44FF5',
            fontFamily: 'sans-serif',
            textShadow: '0 0 26px #B44FF5',
          }}
        >
          K
        </span>
      </div>
    ),
    { ...size }
  );
}
