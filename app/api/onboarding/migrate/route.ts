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
  const { data: nextEvent } = await supabase
    .from('events')
    .select('id, starts_at')
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextEvent) {
    const channel = parsed.data.respuestas.aviso === 'instante' ? 'push' : 'email';
    await supabase
      .from('event_reminders')
      .upsert(
        { user_id: user.id, event_id: nextEvent.id, notify_at: nextEvent.starts_at, channel },
        { onConflict: 'user_id,event_id' }
      );
  }

  // Gamificación (24): primer logro real, desbloqueado en el onboarding — refuerza la respuesta
  // que ya dio el usuario, no un badge de relleno. on_conflict evita duplicarlo en un re-envío.
  if (parsed.data.respuestas.antiguedad === 'og') {
    const { data: badge } = await supabase.from('badges').select('id').eq('code', 'og_army').maybeSingle();
    if (badge) {
      await supabase.from('user_badges').upsert(
        { user_id: user.id, badge_id: badge.id },
        { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
      );
    }
  }

  return NextResponse.json({ success: true });
}
