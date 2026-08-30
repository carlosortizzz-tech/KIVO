// Datos planos compartidos entre la pantalla de servidor (community/page.tsx) y el formulario de
// cliente (ComposePost.tsx). NUNCA exportar esto desde un archivo 'use client' — Next.js no
// comparte constantes de runtime entre servidor y cliente a través del límite de esa directiva,
// solo el componente en sí (causó "CATEGORIES.includes is not a function" en producción).
export const CATEGORIES = ['general', 'pregunta', 'comeback', 'concierto'] as const;
export const categoryKey: Record<(typeof CATEGORIES)[number], string> = {
  general: 'composeCategoryGeneral',
  pregunta: 'composeCategoryPregunta',
  comeback: 'composeCategoryComeback',
  concierto: 'composeCategoryConcierto',
};
