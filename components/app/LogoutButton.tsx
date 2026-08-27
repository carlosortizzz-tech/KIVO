'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { resetAnalytics } from '@/lib/analytics';

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await createClient().auth.signOut();
    resetAnalytics();
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full text-center text-sm font-bold text-danger py-3.5 rounded-2xl border border-border disabled:opacity-50 transition-transform duration-150 active:scale-[0.98]"
    >
      {label}
    </button>
  );
}
