// Control de edad: KIVO es para personas de 13 años o más. Se pregunta solo el AÑO de nacimiento
// (mínimo de datos). La misma regla vive en la base de datos (handle_new_user y set_birth_year).
export const MIN_AGE = 13;
export const MINOR_AGE = 18;

export function isValidBirthYear(year: unknown, now: Date = new Date()): year is number {
  return Number.isInteger(year) && (year as number) >= 1900 && (year as number) <= now.getUTCFullYear();
}

export function ageFromBirthYear(year: number, now: Date = new Date()): number {
  return now.getUTCFullYear() - year;
}

// Del año actual hacia atrás: incluye años que dan menos de 13 a propósito (pregunta neutra: no se
// sugiere una respuesta "correcta").
export function birthYearOptions(now: Date = new Date(), span = 100): number[] {
  const current = now.getUTCFullYear();
  return Array.from({ length: span + 1 }, (_, i) => current - i);
}
