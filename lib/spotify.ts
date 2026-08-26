import { createClient } from '@supabase/supabase-js';

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

async function logSpotifyFailure(detail: string) {
  console.error('spotify fetch falló', { detail });
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    await admin.from('webhook_log').insert({ type: 'spotify:fetch', result: 'error', detail });
  } catch {}
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
