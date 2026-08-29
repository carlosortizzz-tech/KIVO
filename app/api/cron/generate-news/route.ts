import { NextRequest, NextResponse } from 'next/server';
import { generateDailyNews } from '@/lib/news';

export const runtime = 'nodejs';
export const maxDuration = 60; // la búsqueda + extracción puede tardar más que el default de 10s

export async function GET(req: NextRequest) {
  // Mismo guard que el resto de los crons (ver /api/cron/send-reminders).
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!cronSecret || !auth || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await generateDailyNews();
  return NextResponse.json({ ok: true, ...result });
}
