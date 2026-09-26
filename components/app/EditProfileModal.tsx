'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Pencil, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateProfileAppearance } from '@/lib/profile-actions';

const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4MB — generoso para una foto de celular, sin abrir la puerta a archivos enormes

export function EditProfileModal({
  userId,
  initialName,
  initialAvatarUrl,
}: {
  userId: string;
  initialName: string;
  initialAvatarUrl: string | null;
}) {
  const t = useTranslations('cuenta');
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile() {
    fileRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo si se cancela y reintenta
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('editAvatarErrorType'));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(t('editAvatarErrorSize'));
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      // Mismo nombre de archivo siempre (no timestamp) — con upsert:true, subir una foto nueva
      // reemplaza la anterior en vez de acumular basura en el bucket.
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // Cache-bust: la URL pública es siempre la misma ruta, así que sin esto el navegador
      // seguiría mostrando la foto vieja en caché tras reemplazarla.
      setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
    } catch {
      setError(t('editAvatarErrorUpload'));
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateProfileAppearance(name, avatarUrl);
      setOpen(false);
      router.refresh();
    } catch {
      setError(t('editProfileErrorSave'));
    } finally {
      setSaving(false);
    }
  }

  function close() {
    setOpen(false);
    setError(null);
    setName(initialName);
    setAvatarUrl(initialAvatarUrl);
    setPreview(null);
  }

  const shownAvatar = preview ?? avatarUrl;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('editProfile')}
        className="icon-chip-accent firma-icon w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      >
        <Pencil size={14} strokeWidth={2} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(11,7,16,0.8)' }}
          onClick={close}
        >
          <div
            className="bg-surface border border-border rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)] p-5 w-full max-w-[420px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="text-sm font-bold">{t('editProfile')}</div>
              <button type="button" onClick={close} aria-label={t('editClose')} className="text-text2 p-1">
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="flex flex-col items-center mb-5">
              <button
                type="button"
                onClick={pickFile}
                disabled={uploading}
                className="relative w-20 h-20 rounded-full bg-accent-btn flex items-center justify-center font-display text-2xl font-extrabold overflow-hidden mb-2 disabled:opacity-60"
                style={{ boxShadow: 'var(--glow)' }}
                aria-label={t('editAvatarCta')}
              >
                {shownAvatar ? (
                  <Image src={shownAvatar} alt={name || 'Avatar'} width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  (name || '?')[0]?.toUpperCase()
                )}
              </button>
              <button type="button" onClick={pickFile} disabled={uploading} className="text-xs font-bold text-accent2">
                {uploading ? t('editAvatarUploading') : t('editAvatarCta')}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>

            <label className="block text-[11px] font-bold uppercase tracking-wide text-text2 mb-1.5">{t('editNameLabel')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder={t('editNamePlaceholder')}
              className="w-full bg-sunken border border-border rounded-[var(--radius-btn)] px-3.5 py-3 text-sm mb-4 outline-none focus:border-accent"
            />

            {error && <p className="text-xs text-danger mb-3 -mt-2">{error}</p>}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading}
              className="bg-accent-btn text-white font-bold text-[14px] rounded-[var(--radius-btn)] py-3.5 w-full disabled:opacity-50 transition-transform duration-150 active:scale-[0.97]"
              style={{ boxShadow: 'var(--glow)' }}
            >
              {saving ? t('editProfileSaving') : t('editProfileSave')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
