// Colores de marca para imágenes generadas en el servidor (next/og). Ese motor no entiende las
// variables de CSS, así que se repiten aquí los mismos valores de los tokens de app/globals.css
// (--bg, --text, --text2, --accent). Si cambia la paleta en globals.css, cambia también aquí.
export const BRAND = {
  bg: '#0B0710',
  bgGlow: '#1F1430',
  text: '#F5EFFC',
  text2: '#A896C4',
  accentRgb: '180, 79, 245',
} as const;
