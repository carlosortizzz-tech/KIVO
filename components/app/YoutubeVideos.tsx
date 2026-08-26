import { Play } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { getLatestOfficialVideos } from '@/lib/youtube';
import { Reveal } from '@/components/app/Reveal';

export async function YoutubeVideos() {
  const t = await getTranslations('app.guide');
  const videos = await getLatestOfficialVideos(6);
  if (videos.length === 0) return null;

  return (
    <Reveal delayMs={40}>
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-2 mt-6">{t('videosTitle')}</div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
        {videos.map((v) => (
          <a
            key={v.id}
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-40 bg-surface border border-border rounded-2xl overflow-hidden transition-transform duration-150 active:scale-[0.97]"
          >
            <div className="relative w-40 h-24 bg-sunken">
              <Image src={v.thumbnailUrl} alt={v.title} fill className="object-cover" sizes="160px" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                  <Play size={14} fill="white" color="white" strokeWidth={0} />
                </div>
              </div>
            </div>
            <div className="p-2.5">
              <div className="text-[11px] font-bold leading-snug line-clamp-2">{v.title}</div>
            </div>
          </a>
        ))}
      </div>
    </Reveal>
  );
}
