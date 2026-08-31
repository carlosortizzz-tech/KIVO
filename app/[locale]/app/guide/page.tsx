import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Reveal } from '@/components/app/Reveal';
import { ProGate } from '@/components/app/ProGate';
import { getUserPlan } from '@/lib/plan';
import { YoutubeVideos } from '@/components/app/YoutubeVideos';
import { SpotifyTracks } from '@/components/app/SpotifyTracks';
import { KivoNews } from '@/components/app/KivoNews';
import { GuideList, type GuideRow } from '@/components/app/GuideList';

export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const t = await getTranslations('app.guide');
  const locale = await getLocale();
  const { platform: openPlatform } = await searchParams;
  const plan = await getUserPlan();
  if (plan !== 'pro') return <ProGate feature={t('eyebrow')} />;
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('guides')
    .select('id, title, title_en, title_fr, title_ko, category, category_en, category_fr, category_ko, platform, read_minutes, steps, steps_en, steps_fr, steps_ko')
    .order('created_at', { ascending: true });

  // Falla real de Supabase (no "sin guías") — se muestra un estado propio con qué pasó y qué
  // hacer, en vez de reventar a la pantalla de error genérica de Next.js (regla UX de errores).
  if (error) {
    return (
      <div>
        <Reveal>
          <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">{t('eyebrow')}</div>
          <h1 className="font-display text-lg font-extrabold mb-4">{t('title')}</h1>
          <div className="flex flex-col items-center text-center gap-2 py-10">
            <div className="text-sm text-text2">{t('loadError')}</div>
          </div>
        </Reveal>
      </div>
    );
  }

  // Contenido editorial (39-INTERNACIONALIZACION): columnas por idioma con reserva automática al
  // español si falta la traducción de una fila — nunca texto vacío, nunca rompe el build por un
  // campo null.
  const guides: GuideRow[] = (rows ?? []).map((g) => ({
    id: g.id,
    title: (locale === 'en' ? g.title_en : locale === 'fr' ? g.title_fr : locale === 'ko' ? g.title_ko : null) ?? g.title,
    category: (locale === 'en' ? g.category_en : locale === 'fr' ? g.category_fr : locale === 'ko' ? g.category_ko : null) ?? g.category,
    platform: g.platform,
    read_minutes: g.read_minutes,
    steps: ((locale === 'en' ? g.steps_en : locale === 'fr' ? g.steps_fr : locale === 'ko' ? g.steps_ko : null) ?? g.steps) as string[],
  }));

  return (
    <div>
      <Reveal>
        <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">{t('eyebrow')}</div>
        <h1 className="font-display text-lg font-extrabold mb-4">{t('title')}</h1>
      </Reveal>

      <KivoNews />

      {guides.length > 0 ? (
        <GuideList guides={guides} openPlatform={openPlatform} searchPlaceholder={t('search')} noResultsLabel={t('noResults')} />
      ) : (
        <div className="flex flex-col items-center text-center gap-2 py-10">
          <div className="text-sm text-text2">{t('empty')}</div>
        </div>
      )}
      <YoutubeVideos />
      <SpotifyTracks />
    </div>
  );
}
