// Canal oficial "HYBE LABELS" en YouTube — publica los MVs y contenido oficial de BTS.
const HYBE_LABELS_CHANNEL_ID = 'UC9SO4DC6RiE3F2To400_2Sw';

export type YoutubeVideo = {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  url: string;
};

// playlistItems.list cuesta 1 unidad de cuota (vs. 100 de search.list) — la lista de "subidos"
// de un canal es siempre uploads_<channelId sin el prefijo UC>, no hace falta una llamada aparte.
function uploadsPlaylistId(channelId: string): string {
  return 'UU' + channelId.slice(2);
}

export async function getLatestOfficialVideos(maxResults = 6): Promise<YoutubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const playlistId = uploadsPlaylistId(HYBE_LABELS_CHANNEL_ID);
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`;

  try {
    // Cache de 1 hora: suficiente frescura para "últimos videos" sin gastar cuota en cada visita.
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
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
  } catch {
    return [];
  }
}
