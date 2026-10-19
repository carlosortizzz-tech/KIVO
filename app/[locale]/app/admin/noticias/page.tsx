import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/admin';
import { AdminNewsDrafts, type NewsDraftRow } from '@/components/app/AdminNewsDrafts';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function AdminNewsDraftsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect('/app');
  }

  const { data } = await getAdmin()
    .from('news_drafts')
    .select('id, headline, summary, headline_en, summary_en, headline_fr, summary_fr, headline_ko, summary_ko, sources, notes, category, place, image_source_url, image_credit, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  const drafts: NewsDraftRow[] = (data ?? []).map((d) => ({
    id: d.id,
    headline: d.headline,
    summary: d.summary,
    sources: Array.isArray(d.sources) ? d.sources : [],
    missingLangs: (['en', 'fr', 'ko'] as const).filter((l) => !filled(d[`headline_${l}`]) || !filled(d[`summary_${l}`])),
    notes: d.notes,
    category: d.category,
    place: d.place,
    imageSourceUrl: d.image_source_url,
    imageCredit: d.image_credit,
    createdAt: d.created_at,
  }));

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">Admin</div>
      <h1 className="font-display text-2xl font-extrabold mb-1 tracking-tight">Noticias por aprobar</h1>
      <p className="text-sm text-text2 mb-4 max-w-[40ch]">
        Abre las dos fuentes de cada noticia y confirma que dicen lo mismo. Al publicar, entra a la app en los 4 idiomas y se envía al canal de Telegram.
      </p>
      <AdminNewsDrafts drafts={drafts} />
    </div>
  );
}
