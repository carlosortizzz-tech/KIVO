import { createClient } from '@supabase/supabase-js';

// Canal oficial de BTS en YouTube (BANGTANTV) — NO el de "HYBE LABELS" (ese es el canal
// general del sello con TODOS sus artistas, mezclaría contenido de otros grupos). Se resuelve
// por handle en vez de un ID fijo, para no depender de memorizar mal el ID interno del canal.
const BTS_HANDLE = 'BANGTANTV';

export type YoutubeVideo = {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  url: string;
};

function uploadsPlaylistId(channelId: string): string {
  return 'UU' + channelId.slice(2);
}

async function logYoutubeFailure(detail: string) {
  console.error('youtube fetch falló', { detail });
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    await admin.from('webhook_log').insert({ type: 'youtube:fetch', result: 'error', detail });
  } catch {}
}

async function resolveChannelId(handle: string, apiKey: string): Promise<string | null> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 86400 } }); // el canal casi nunca cambia — cache de 24h
  if (!res.ok) {
    await logYoutubeFailure(`resolveChannelId HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return null;
  }
  const data = await res.json();
  return data.items?.[0]?.id ?? null;
}

export async function getLatestOfficialVideos(maxResults = 6): Promise<YoutubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) { await logYoutubeFailure('YOUTUBE_API_KEY no configurada'); return []; }

  try {
    const channelId = await resolveChannelId(BTS_HANDLE, apiKey);
    if (!channelId) { await logYoutubeFailure(`No se encontró el canal @${BTS_HANDLE}`); return []; }

    const playlistId = uploadsPlaylistId(channelId);
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`;

    // Cache de 1 hora: suficiente frescura para "últimos videos" sin gastar cuota en cada visita.
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      const body = await res.text();
      await logYoutubeFailure(`HTTP ${res.status}: ${body.slice(0, 500)}`);
      return [];
    }
    const data = await res.json();
    return (data.items ?? []).map((item: {
      snippet: {
        title: string;
        publishedAt: string;
        resourceId: { videoId: string };
        thumbnails: { medium?: { url: string }; default: { url: string } };
      };
    }) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default.url,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
    }));
  } catch (err) {
    await logYoutubeFailure(err instanceof Error ? err.message : String(err));
    return [];
  }
}
