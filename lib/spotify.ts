// BTS en Spotify: ID fijo y estable (a diferencia de YouTube, el ID de artista de Spotify
// es público y documentado — no hace falta resolverlo por búsqueda cada vez).
const BTS_ARTIST_ID = '3Nrfpe0tUJi4K4DXYWgMUX';

export type SpotifyTrack = {
  id: string;
  name: string;
  albumImageUrl: string;
  popularity: number; // 0-100, score relativo de Spotify — NO es el conteo real de streams
  url: string;
};

// Spotify bloquea esta llamada A PROPÓSITO desde 2026 (exige 250k+ usuarios activos/mes para
// Extended Quota Mode — ver ESTADO.md) — el 403 es esperado y permanente, no un incidente.
// Solo console.error para debug local; NO se escribe a webhook_log (eso es para incidentes
// reales de Hotmart) para no llenar el panel del dueño de "errores" que ya sabemos que van a
// pasar siempre, en cada carga de KIVO Guide.
function logSpotifyFailure(detail: string) {
  console.error('spotify fetch falló (esperado, ver ESTADO.md)', { detail });
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    await logSpotifyFailure('SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET no configuradas');
    return null;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    // Los tokens de client_credentials duran 1h — cachear un poco menos evita usar uno vencido.
    next: { revalidate: 3300 },
  });
  if (!res.ok) {
    await logSpotifyFailure(`token HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return null;
  }
  const data = await res.json();
  return data.access_token ?? null;
}

export async function getTopTracks(limit = 6): Promise<SpotifyTrack[]> {
  try {
    const token = await getAccessToken();
    if (!token) return [];

    const res = await fetch(
      `https://api.spotify.com/v1/artists/${BTS_ARTIST_ID}/top-tracks?market=US`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      await logSpotifyFailure(`top-tracks HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return [];
    }
    const data = await res.json();
    const tracks = (data.tracks ?? []).slice(0, limit);
    return tracks.map((t: {
      id: string;
      name: string;
      popularity: number;
      album: { images: { url: string }[] };
      external_urls: { spotify: string };
    }) => ({
      id: t.id,
      name: t.name,
      albumImageUrl: t.album.images[0]?.url ?? '',
      popularity: t.popularity,
      url: t.external_urls.spotify,
    }));
  } catch (err) {
    await logSpotifyFailure(err instanceof Error ? err.message : String(err));
    return [];
  }
}
