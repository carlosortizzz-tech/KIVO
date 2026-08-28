import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// K de KIVO en los colores de marca vigentes (FICHA-ARTE): fondo #0B0710, acento morado neón
// #B44FF5. Generado en build time — reemplaza el favicon.ico genérico anterior.
// Hex directo a propósito: este archivo lo renderiza Satori (next/og), que NO carga globals.css
// ni resuelve var(--...) — solo estilos inline planos. Los mismos valores que la Ficha de Arte,
// escritos literal porque acá no hay otra forma.
export default function Icon() {
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
          borderRadius: 8,
          border: '3px solid #B44FF5',
          boxShadow: '0 0 10px 2px #B44FF5',
        }}
      >
        <span
          style={{
            fontSize: 21,
            fontWeight: 800,
            color: '#B44FF5',
            fontFamily: 'sans-serif',
            textShadow: '0 0 6px #B44FF5',
          }}
        >
          K
        </span>
      </div>
    ),
    { ...size }
  );
}
