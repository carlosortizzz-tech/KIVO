import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// KIVO News (30-INTEGRACION-IA): corre 1x/día vía cron, NUNCA por usuario — así el costo de IA es
// fijo y bajísimo (una búsqueda + un resumen al día, compartido por todos), en vez de una llamada
// cara por cada persona que abre la pantalla.
//
// Dos secciones, cada una con su propio par búsqueda+extracción (no comparten la misma búsqueda —
// "qué pasó" y "qué va a pasar" son preguntas distintas y mezclarlas en un solo texto degrada
// ambas):
// 1) NOTICIAS ('news'): lo que ya pasó, últimas 48-72h.
// 2) CALENDARIO ('schedule'): eventos OFICIALES CONFIRMADOS de los próximos 14 días — la pieza que
//    faltaba del plan original (agenda + hora local, pedido explícito del usuario).
//
// Cada pipeline: 1) búsqueda real con el tool nativo de Anthropic (web_search) — grounding real,
// no memoria del modelo (docs/sistema/30). 2) Extracción a JSON estructurado con tool_choice
// forzado + zod — no se puede forzar el esquema Y dejar que el modelo busque libremente en la
// misma llamada, así que se separan.
//
// Regla dura (pedida por el usuario desde el inicio): sin URL de fuente verificable, NO se publica
// — se descarta acá en código, no se confía solo en que el modelo "decida" no inventar. Para el
// calendario esto es AÚN más importante: una fecha equivocada mostrada como "confirmada" puede
// hacer que alguien se pierda un evento real — justo lo opuesto a la promesa central de KIVO.

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function logNewsFailure(detail: string) {
  console.error('kivo news: fallo', { detail });
  try {
    await getAdmin().from('webhook_log').insert({ type: 'news:generate', result: 'error', detail });
  } catch {}
}

async function search(client: Anthropic, prompt: string, label: string): Promise<string | null> {
  try {
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [{ role: 'user', content: prompt }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    if (!text.trim()) {
      await logNewsFailure(`${label}: búsqueda vacía (sin texto de respuesta)`);
      return null;
    }
    return text;
  } catch (err) {
    await logNewsFailure(`${label} búsqueda: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

const NewsItemSchema = z.object({
  headline: z.string().min(1).max(200),
  summary: z.string().min(1).max(600),
  source_url: z.string().url(),
  source_name: z.string().min(1).max(120),
  published_at: z.string().optional(),
});
const NewsListSchema = z.object({ items: z.array(NewsItemSchema).max(6) });

const newsExtractTool = {
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

const ScheduleItemSchema = z.object({
  headline: z.string().min(1).max(200),
  summary: z.string().min(1).max(600),
  source_url: z.string().url(),
  source_name: z.string().min(1).max(120),
  event_at: z.string().optional(), // ISO 8601 CON hora si se conoce (para convertir a hora local en la UI); si no, se omite
});
const ScheduleListSchema = z.object({ items: z.array(ScheduleItemSchema).max(8) });

const scheduleExtractTool = {
  name: 'save_schedule_items',
  description: 'Guarda los eventos oficiales confirmados de BTS de los próximos 14 días.',
  input_schema: {
    type: 'object' as const,
    properties: {
      items: {
        type: 'array',
        maxItems: 8,
        items: {
          type: 'object',
          properties: {
            headline: { type: 'string', description: 'Qué es el evento, corto y claro, en español' },
            summary: { type: 'string', description: '1-2 frases con el detalle (dónde, qué canal, etc.)' },
            source_url: { type: 'string', description: 'URL exacta del anuncio oficial' },
            source_name: { type: 'string', description: 'Nombre del medio o cuenta oficial' },
            event_at: { type: 'string', description: 'Fecha y hora del evento en ISO 8601 CON zona horaria, SOLO si se encontró exacta' },
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

async function extract<Item>(
  client: Anthropic,
  searchText: string,
  tool: typeof newsExtractTool | typeof scheduleExtractTool,
  schema: z.ZodType<{ items: Item[] }>,
  label: string
): Promise<Item[]> {
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1536,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [
        {
          role: 'user',
          content: `Convierte este reporte a la estructura pedida. Si el reporte dice que no encontró nada verificable, guarda una lista vacía — nunca inventes un item para rellenar.\n\n${searchText}`,
        },
      ],
    });
    const toolUse = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const parsed = schema.safeParse(toolUse?.input);
    if (parsed.success) return parsed.data.items;
    await logNewsFailure(`${label} extracción no validó: ${parsed.error.message}`);
    return [];
  } catch (err) {
    await logNewsFailure(`${label} extracción: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

function validUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

// El cron corre todos los días y puede volver a encontrar la MISMA noticia/anuncio que ayer
// (sigue dentro de la ventana de búsqueda) — sin este filtro, se iría duplicando para siempre.
// La URL de la fuente es la clave natural de "es lo mismo": el mismo artículo no se resume dos veces.
async function withoutAlreadyPublished<T extends { source_url: string }>(
  admin: ReturnType<typeof getAdmin>,
  items: T[]
): Promise<T[]> {
  if (items.length === 0) return items;
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: existing } = await admin
    .from('news_items')
    .select('source_url')
    .in('source_url', items.map((it) => it.source_url))
    .gte('created_at', monthAgo);
  const seen = new Set((existing ?? []).map((e) => e.source_url));
  return items.filter((it) => !seen.has(it.source_url));
}

export async function generateDailyNews(): Promise<{ inserted: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await logNewsFailure('ANTHROPIC_API_KEY no configurada');
    return { inserted: 0 };
  }
  const client = new Anthropic({ apiKey });
  const admin = getAdmin();
  let totalInserted = 0;

  // --- NOTICIAS (lo que ya pasó) ---
  const newsSearchText = await search(
    client,
    'Busca las noticias más importantes y VERIFICABLES de BTS (el grupo de K-pop) de las ' +
      'últimas 48-72 horas: lanzamientos oficiales, actividades de los miembros, anuncios ' +
      'oficiales de HYBE/BIGHIT MUSIC, presentaciones, colaboraciones confirmadas. ' +
      'EXCLUYE rumores, especulación, chismes de vida personal, o cualquier cosa sin fuente ' +
      'clara de un medio reconocido (Billboard, Soompi, Allkpop, Rolling Stone, cuentas ' +
      'oficiales verificadas, etc.). Para cada noticia real que encuentres, incluye la URL ' +
      'EXACTA de la fuente donde la leíste. Responde en español. Si no encuentras nada ' +
      'verificable y reciente, dilo explícitamente — no inventes nada.',
    'noticias'
  );
  if (newsSearchText) {
    const items = await extract(client, newsSearchText, newsExtractTool, NewsListSchema, 'noticias');
    const valid = await withoutAlreadyPublished(admin, items.filter((it) => validUrl(it.source_url)));
    if (valid.length > 0) {
      const { error } = await admin.from('news_items').insert(
        valid.map((it) => ({
          kind: 'news',
          headline: it.headline,
          summary: it.summary,
          source_url: it.source_url,
          source_name: it.source_name,
          published_at: it.published_at ?? null,
        }))
      );
      if (error) await logNewsFailure(`noticias insert: ${error.message}`);
      else totalInserted += valid.length;
    }
  }

  // --- CALENDARIO (próximos 14 días, SOLO confirmado oficialmente) ---
  const scheduleSearchText = await search(
    client,
    'Busca eventos OFICIALES y CONFIRMADOS de BTS (el grupo de K-pop) programados para los ' +
      'próximos 14 días a partir de hoy: lanzamientos de música/videos con fecha anunciada, ' +
      'conciertos, transmisiones en vivo, ceremonias o premiaciones donde vayan a estar. ' +
      'SOLO incluye lo que un anuncio OFICIAL (HYBE/BIGHIT MUSIC, Weverse, o un medio confiable ' +
      'citando la fuente oficial) haya confirmado con fecha — NUNCA rumores, especulación, ni ' +
      '"se espera que". Si encuentras la hora exacta del evento, inclúyela con su zona horaria. ' +
      'Responde en español. Si no hay nada confirmado para los próximos 14 días, dilo ' +
      'explícitamente — no inventes fechas.',
    'calendario'
  );
  if (scheduleSearchText) {
    const items = await extract(client, scheduleSearchText, scheduleExtractTool, ScheduleListSchema, 'calendario');
    const valid = await withoutAlreadyPublished(admin, items.filter((it) => validUrl(it.source_url)));
    if (valid.length > 0) {
      const { error } = await admin.from('news_items').insert(
        valid.map((it) => ({
          kind: 'schedule',
          headline: it.headline,
          summary: it.summary,
          source_url: it.source_url,
          source_name: it.source_name,
          event_at: it.event_at ?? null,
        }))
      );
      if (error) await logNewsFailure(`calendario insert: ${error.message}`);
      else totalInserted += valid.length;
    }
  }

  await admin.from('webhook_log').insert({ type: 'news:generate', result: 'applied', detail: `${totalInserted} items publicados` });
  return { inserted: totalInserted };
}
