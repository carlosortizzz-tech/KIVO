import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// K de KIVO en los colores de marca vigentes (FICHA-ARTE): fondo #0B0710, acento morado neón
// #B44FF5. Generado en build time — reemplaza el favicon.ico genérico anterior.
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
          borderRadius: 7,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#B44FF5',
            fontFamily: 'sans-serif',
          }}
        >
          K
        </span>
      </div>
    ),
    { ...size }
  );
}
