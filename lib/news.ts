import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// KIVO News (30-INTEGRACION-IA): corre 1x/día vía cron, NUNCA por usuario — así el costo de IA es
// fijo y bajísimo (una búsqueda + un resumen al día, compartido por todos), en vez de una llamada
// cara por cada persona que abre la pantalla.
//
// Dos pasos, a propósito NO uno solo:
// 1) Búsqueda real con el tool nativo de Anthropic (web_search) — grounding real, no memoria del
//    modelo (docs/sistema/30: "nunca confíes en el conocimiento interno para datos factuales").
// 2) Extracción a JSON estructurado con tool_choice forzado + zod — no se puede forzar el esquema
//    Y dejar que el modelo busque libremente en la misma llamada, así que se separan.
//
// Regla dura (pedida por el usuario desde el inicio): sin URL de fuente verificable, NO se publica
// — se descarta acá en código, no se confía solo en que el modelo "decida" no inventar.

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const NewsItemSchema = z.object({
  headline: z.string().min(1).max(200),
  summary: z.string().min(1).max(600),
  source_url: z.string().url(),
  source_name: z.string().min(1).max(120),
  published_at: z.string().optional(), // ISO date si el modelo lo encontró; si no, se omite (no se inventa)
});
const NewsListSchema = z.object({ items: z.array(NewsItemSchema).max(6) });

const extractTool = {
  name: 'save_news_items',
  description: 'Guarda las noticias reales de BTS encontradas, con su fuente exacta.',
  input_schema: {
    type: 'object' as const,
    properties: {
      items: {
        type: 'array',
        maxItems: 6,
        items: {
          type: 'object',
          properties: {
            headline: { type: 'string', description: 'Titular corto en español, sin clickbait' },
            summary: { type: 'string', description: '1-2 frases en español, solo hechos verificados en la búsqueda' },
            source_url: { type: 'string', description: 'URL exacta y completa de la fuente original' },
            source_name: { type: 'string', description: 'Nombre del medio o sitio (ej. "Billboard", "Soompi")' },
            published_at: { type: 'string', description: 'Fecha de publicación en ISO 8601, SOLO si se encontró' },
          },
          required: ['headline', 'summary', 'source_url', 'source_name'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
};

async function logNewsFailure(detail: string) {
  console.error('kivo news: fallo', { detail });
  try {
    await getAdmin().from('webhook_log').insert({ type: 'news:generate', result: 'error', detail });
  } catch {}
}

export async function generateDailyNews(): Promise<{ inserted: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await logNewsFailure('ANTHROPIC_API_KEY no configurada');
    return { inserted: 0 };
  }
  const client = new Anthropic({ apiKey });

  // Paso 1: búsqueda real (grounding) — modelo de generación principal, el tool de búsqueda
  // funciona mejor con un modelo más capaz que Haiku para sintetizar bien los resultados.
  let searchText = '';
  try {
    const searchRes = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [
        {
          role: 'user',
          content:
            'Busca las noticias más importantes y VERIFICABLES de BTS (el grupo de K-pop) de las ' +
            'últimas 48-72 horas: lanzamientos oficiales, actividades de los miembros, anuncios ' +
            'oficiales de HYBE/BIGHIT MUSIC, presentaciones, colaboraciones confirmadas. ' +
            'EXCLUYE rumores, especulación, chismes de vida personal, o cualquier cosa sin fuente ' +
            'clara de un medio reconocido (Billboard, Soompi, Allkpop, Rolling Stone, cuentas ' +
            'oficiales verificadas, etc.). Para cada noticia real que encuentres, incluye la URL ' +
            'EXACTA de la fuente donde la leíste. Responde en español. Si no encuentras nada ' +
            'verificable y reciente, dilo explícitamente — no inventes nada.',
        },
      ],
    });
    searchText = searchRes.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  } catch (err) {
    await logNewsFailure(`búsqueda: ${err instanceof Error ? err.message : String(err)}`);
    return { inserted: 0 };
  }

  if (!searchText.trim()) {
    await logNewsFailure('búsqueda vacía (sin texto de respuesta)');
    return { inserted: 0 };
  }

  // Paso 2: extraer a JSON estructurado (Haiku — es solo formatear lo ya encontrado, no buscar).
  let items: z.infer<typeof NewsListSchema>['items'] = [];
  try {
    const extractRes = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1536,
      tools: [extractTool],
      tool_choice: { type: 'tool', name: 'save_news_items' },
      messages: [
        {
          role: 'user',
          content: `Convierte este reporte de noticias a la estructura pedida. Si el reporte dice que no encontró nada verificable, guarda una lista vacía — nunca inventes un item para rellenar.\n\n${searchText}`,
        },
      ],
    });
    const toolUse = extractRes.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const parsed = NewsListSchema.safeParse(toolUse?.input);
    if (parsed.success) {
      items = parsed.data.items;
    } else {
      await logNewsFailure(`extracción no validó: ${parsed.error.message}`);
      return { inserted: 0 };
    }
  } catch (err) {
    await logNewsFailure(`extracción: ${err instanceof Error ? err.message : String(err)}`);
    return { inserted: 0 };
  }

  // Regla dura: sin URL de fuente real y válida, no se publica — filtro en código, no confianza ciega.
  const valid = items.filter((it) => {
    try {
      const u = new URL(it.source_url);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  });

  if (valid.length === 0) {
    await getAdmin().from('webhook_log').insert({ type: 'news:generate', result: 'applied', detail: 'sin noticias verificables hoy' });
    return { inserted: 0 };
  }

  const admin = getAdmin();
  const { error } = await admin.from('news_items').insert(
    valid.map((it) => ({
      headline: it.headline,
      summary: it.summary,
      source_url: it.source_url,
      source_name: it.source_name,
      published_at: it.published_at ?? null,
    }))
  );
  if (error) {
    await logNewsFailure(`insert: ${error.message}`);
    return { inserted: 0 };
  }

  await admin.from('webhook_log').insert({ type: 'news:generate', result: 'applied', detail: `${valid.length} noticias publicadas` });
  return { inserted: valid.length };
}
