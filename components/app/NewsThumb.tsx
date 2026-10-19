import Image from 'next/image';

// Imagen propia de la noticia (la dibuja /api/news-image/[id]); decorativa, por eso sin texto alternativo.
export function NewsThumb({ id, size = 64 }: { id: string; size?: 64 | 80 }) {
  return (
    <Image
      src={`/api/news-image/${id}`}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={`${size === 80 ? 'w-20 h-20' : 'w-16 h-16'} rounded-xl flex-shrink-0 bg-sunken`}
    />
  );
}
