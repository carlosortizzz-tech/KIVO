'use client';

// La fecha se guarda en UTC en la base de datos; convertir a la hora LOCAL del navegador de quien
// mira (no la de KIVO ni la del servidor) es justo lo que pedía el plan original ("agenda + hora
// local ajustada a tu zona horaria").
export function LocalEventTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const formatted = date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  return <span>{formatted}</span>;
}
