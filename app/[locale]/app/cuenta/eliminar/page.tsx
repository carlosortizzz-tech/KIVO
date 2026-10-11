import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { DeleteAccountForm } from '@/components/app/DeleteAccountForm';

export default async function EliminarCuentaPage() {
  const t = await getTranslations('cuenta');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('plan, status').eq('id', user.id).maybeSingle();
  const hasPaidPlan = profile?.plan === 'pro' && ['active', 'trialing', 'past_due'].includes(profile?.status ?? '');

  const items = [t('deleteItem1'), t('deleteItem2'), t('deleteItem3'), t('deleteItem4')];

  return (
    <div>
      <Link href="/app/cuenta" className="text-xs text-text2 mb-4 inline-block">{t('back')}</Link>
      <h1 className="font-display text-lg font-extrabold mb-3">{t('deleteTitle')}</h1>
      <p className="text-sm text-text2 leading-relaxed mb-4">{t('deleteIntro')}</p>

      <ul className="bg-surface border border-border rounded-2xl p-4 mb-5 flex flex-col gap-2 text-xs text-text2 leading-relaxed list-disc list-inside">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <DeleteAccountForm hasPaidPlan={hasPaidPlan} />
    </div>
  );
}
