import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateIcs } from '@/lib/calendar';

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from('events')
    .select('id, title, starts_at, ends_at, description, url')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const ics = generateIcs({
    id: event.id,
    title: event.title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    description: event.description,
    url: event.url,
  });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="kivo-${event.id}.ics"`,
    },
  });
}
