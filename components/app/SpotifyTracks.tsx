import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { getTopTracks } from '@/lib/spotify';
import { Reveal } from '@/components/app/Reveal';

export async function SpotifyTracks() {
  const t = await getTranslations('app.guide');
  const tracks = await getTopTracks(6);
  if (tracks.length === 0) return null;

  return (
    <Reveal delayMs={80}>
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1 mt-6">{t('spotifyTitle')}</div>
      <p className="text-[11px] text-text2 mb-2">{t('spotifyNote')}</p>
      <div className="flex flex-col gap-2">
        {tracks.map((track) => (
          <a
            key={track.id}
            href={track.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-surface border border-border rounded-2xl p-2.5 transition-transform duration-150 active:scale-[0.98]"
          >
            {track.albumImageUrl && (
              <Image src={track.albumImageUrl} alt={track.name} width={44} height={44} className="rounded-xl flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold truncate">{track.name}</div>
              <div className="text-[10px] text-text2">{t('popularity', { score: track.popularity })}</div>
            </div>
          </a>
        ))}
      </div>
    </Reveal>
  );
}
