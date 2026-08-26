'use client';

import { useState, useRef } from 'react';
import { Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

const MAX_BYTES = 5 * 1024 * 1024;

export function ExperienceComposer() {
  const t = useTranslations('app.community.experiences');
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setErrorMsg(t('photoTooBig'));
      return;
    }
    setErrorMsg('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('no-session');

      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('concert-photos').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('concert-photos').getPublicUrl(path);
      const { error: insertError } = await supabase.from('concert_experiences').insert({
        user_id: user.id,
        photo_url: publicUrl.publicUrl,
        caption: caption.trim() || null,
      });
      if (insertError) throw insertError;

      setFile(null);
      setPreview(null);
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
      setStatus('idle');
      router.refresh();
    } catch {
      setStatus('error');
      setErrorMsg(t('shareError'));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-3.5 mb-4 flex flex-col gap-3">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickFile} className="hidden" id="experience-photo" />
      {preview ? (
        <label htmlFor="experience-photo" className="block relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="w-full h-full object-cover" />
        </label>
      ) : (
        <label
          htmlFor="experience-photo"
          className="flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-xl py-8 text-text2 cursor-pointer"
        >
          <Camera size={22} strokeWidth={2} />
          <span className="text-[13px] font-semibold">{t('addPhoto')}</span>
        </label>
      )}
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={t('captionPlaceholder')}
        maxLength={500}
        rows={2}
        className="w-full bg-sunken border border-border rounded-xl px-3 py-2.5 text-sm resize-none"
      />
      {errorMsg && <p className="text-[12px] text-warn">{errorMsg}</p>}
      <button
        type="submit"
        disabled={!file || status === 'sending'}
        className="bg-accent-btn text-white font-bold text-[13px] rounded-xl py-2.5 disabled:opacity-50"
        style={{ boxShadow: 'var(--glow)' }}
      >
        {status === 'sending' ? t('sharing') : t('share')}
      </button>
    </form>
  );
}
