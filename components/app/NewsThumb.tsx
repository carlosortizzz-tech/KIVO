import Image from 'next/image';

// Imagen de la noticia: la foto libre del lugar si la tiene (guardada en el almacenamiento de KIVO) o,
// si no, la ilustración propia que dibuja /api/news-image/[id]. Decorativa, por eso sin texto alternativo.
export function NewsThumb({ id, photoUrl, size = 64 }: { id: string; photoUrl?: string | null; size?: 64 | 80 }) {
  return (
    <Image
      src={photoUrl || `/api/news-image/${id}`}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={`${size === 80 ? 'w-20 h-20' : 'w-16 h-16'} rounded-xl flex-shrink-0 bg-sunken object-cover`}
    />
  );
}
