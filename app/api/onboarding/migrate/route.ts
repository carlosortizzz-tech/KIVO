import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  v: z.literal(1),
  respuestas: z.object({
    antiguedad: z.enum(['nuevo', 'medio', 'og', 'perdida']).optional(),
    dolor: z.enum(['tickets', 'comebacks', 'membresia', 'todo']).optional(),
    plataforma: z.enum(['weverse', 'bubble', 'twitter', 'todas']).optional(),
    aviso: z.enum(['instante', 'resumen', 'urgente']).optional(),
  }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  // Suscribe al usuario al próximo evento real como su primer recordatorio,
  // channel según su preferencia de aviso (instante -> push, resto -> email como default seguro).
  // Cada escritura se revisa: el paywall borra la copia de respaldo de las respuestas cuando esto
  // responde OK, así que un OK con escrituras fallidas las perdía para siempre.
  const failed = (step: string, message: string) => {
    console.error(`onboarding migrate: ${step} failed`, message);
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  };

  const { data: nextEvent, error: eventError } = await supabase
    .from('events')
    .select('id, starts_at')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (eventError) return failed('next event', eventError.message);

  if (nextEvent) {
    // El aviso de regalo del plan gratis (1 activo a la vez; Pro: todos). Pasa por la función de
    // la base de datos que aplica ese límite — los usuarios ya no pueden insertar avisos directo.
    // 'free_limit' no es error: la persona ya tenía su aviso gratis en otro evento y lo conserva.
    const { error: reminderError } = await supabase.rpc('activate_event_reminder', { p_event_id: nextEvent.id });
    if (reminderError) return failed('reminder', reminderError.message);
  }

  // Gamificación (24): primer logro real, desbloqueado en el onboarding — refuerza la respuesta
  // que ya dio el usuario, no un badge de relleno. grant_og_army_badge() (SECURITY DEFINER) es
  // atómica e idempotente — el cliente ya NO puede insertar en user_badges directo (hallazgo de
  // seguridad del 2026-08-30: permitía auto-otorgarse cualquier insignia sin haberla cumplido).
  if (parsed.data.respuestas.antiguedad === 'og') {
    const { error: badgeError } = await supabase.rpc('grant_og_army_badge');
    if (badgeError) return failed('og badge', badgeError.message);
  }

  return NextResponse.json({ success: true });
}
