// Curva de nivel geométrica (24-GAMIFICACION, mecánica 2) — niveles tempranos rápidos, altos
// aspiracionales. El XP en sí vive solo en el servidor (profiles.xp_total, escrito únicamente
// desde bump_streak()); esto solo traduce ese número a nivel + progreso para la UI.
const BASE_XP = 100;
const GROWTH = 1.4;

export function xpParaNivel(nivel: number): number {
  return Math.round(BASE_XP * Math.pow(GROWTH, nivel - 1));
}

export function nivelActual(xpTotal: number): number {
  let nivel = 1;
  let acumulado = 0;
  while (acumulado + xpParaNivel(nivel) <= xpTotal) {
    acumulado += xpParaNivel(nivel);
    nivel++;
  }
  return nivel;
}

export function progresoDeNivel(xpTotal: number): { nivel: number; xpEnNivel: number; xpParaSiguiente: number } {
  const nivel = nivelActual(xpTotal);
  let acumulado = 0;
  for (let n = 1; n < nivel; n++) acumulado += xpParaNivel(n);
  return { nivel, xpEnNivel: xpTotal - acumulado, xpParaSiguiente: xpParaNivel(nivel) };
}
