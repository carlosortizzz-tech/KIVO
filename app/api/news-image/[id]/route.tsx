import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';
import { BRAND } from '@/lib/brand-colors';

export const runtime = 'nodejs';

// Imagen propia de cada noticia (no se usan fotos de terceros): icono de su categoría + el lugar.
// Sin texto en español para que sirva igual en los 4 idiomas. Se busca por id (en noticias ya
// publicadas o en borradores) y solo se lee categoría y lugar, así nadie puede hacer que KIVO dibuje
// un texto cualquiera.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Shape = ['path', { d: string }] | ['circle', { cx: string; cy: string; r: string }] | ['rect', { width: string; height: string; x: string; y: string; rx: string }];

// Trazos de Lucide (los mismos iconos de la app), uno por categoría. "general" es para noticias
// anteriores que todavía no tienen categoría.
const ICONS: Record<string, Shape[]> = {
  concierto: [
    ['path', { d: 'M9 18V5l12-2v13' }],
    ['circle', { cx: '6', cy: '18', r: '3' }],
    ['circle', { cx: '18', cy: '16', r: '3' }],
  ],
  lanzamiento: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'M6 12c0-1.7.7-3.2 1.8-4.2' }],
    ['circle', { cx: '12', cy: '12', r: '2' }],
    ['path', { d: 'M18 12c0 1.7-.7 3.2-1.8 4.2' }],
  ],
  gira: [
    ['circle', { cx: '6', cy: '19', r: '3' }],
    ['path', { d: 'M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15' }],
    ['circle', { cx: '18', cy: '5', r: '3' }],
  ],
  comunidad: [
    ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
    ['path', { d: 'M16 3.128a4 4 0 0 1 0 7.744' }],
    ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }],
    ['circle', { cx: '9', cy: '7', r: '4' }],
  ],
  oficial: [
    ['path', { d: 'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z' }],
    ['path', { d: 'm9 12 2 2 4-4' }],
  ],
  general: [
    ['path', { d: 'M15 18h-5' }],
    ['path', { d: 'M18 14h-8' }],
    ['path', { d: 'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2' }],
    ['rect', { width: '8', height: '4', x: '10', y: '6', rx: '1' }],
  ],
};

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response(null, { status: 404 });

  const admin = getAdmin();
  let row: { category: string | null; place: string | null } | null = null;
  const published = await admin.from('news_items').select('category, place').eq('id', id).maybeSingle();
  row = published.data;
  if (!row) {
    const draft = await admin.from('news_drafts').select('category, place').eq('id', id).maybeSingle();
    row = draft.data;
  }
  if (!row) return new Response(null, { status: 404 });

  const shapes = ICONS[row.category ?? ''] ?? ICONS.general;
  const place = row.place?.trim() || null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 40,
          background: `linear-gradient(160deg, ${BRAND.bgGlow} 0%, ${BRAND.bg} 70%)`,
          color: BRAND.text,
        }}
      >
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: BRAND.text2, letterSpacing: 2 }}>KIVO</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 208,
              height: 208,
              borderRadius: 56,
              background: `rgba(${BRAND.accentRgb}, 0.16)`,
              border: `3px solid rgba(${BRAND.accentRgb}, 0.55)`,
            }}
          >
            <svg width="112" height="112" viewBox="0 0 24 24" fill="none" stroke={BRAND.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {shapes.map((s, i) =>
                s[0] === 'path' ? (
                  <path key={i} d={s[1].d} />
                ) : s[0] === 'circle' ? (
                  <circle key={i} cx={s[1].cx} cy={s[1].cy} r={s[1].r} />
                ) : (
                  <rect key={i} width={s[1].width} height={s[1].height} x={s[1].x} y={s[1].y} rx={s[1].rx} />
                )
              )}
            </svg>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', fontSize: 38, fontWeight: 700, height: 96 }}>{place ?? ''}</div>
      </div>
    ),
    {
      width: 512,
      height: 512,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    }
  );
}
