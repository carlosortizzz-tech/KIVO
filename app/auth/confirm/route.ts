import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { finalizeAuth } from '@/lib/auth-finalize';
import { isKivoOrigin, safeNextPath } from '@/lib/auth-redirect';

// Enlace del correo (registro, enlace mágico y acceso post-compra) con token_hash + verifyOtp, NO
// con el `?code=` de PKCE: el código PKCE solo se puede canjear en el MISMO navegador que pidió el
// enlace, y el correo casi siempre se abre en otro (el registro se hace dentro de Instagram, el
// enlace abre en Gmail/Chrome). Causa raíz de 0 personas llegando al paywall por correo
// (2026-09-27). Las plantillas de correo de Supabase apuntan aquí:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}
//
// GET NO canjea el enlace: solo lleva a /confirmar, una pantalla con un botón que hace POST aquí.
// Los verificadores de links de los correos (Outlook Safe Links, antivirus) abren el enlace ANTES
// que la persona, y si el GET lo canjeara, lo gastarían — la persona llegaría a "enlace vencido".
// El POST además exige venir de KIVO mismo, para que otra web no pueda iniciarle a alguien una
// sesión en una cuenta ajena enviando el formulario sola.
const ALLOWED_TYPES: EmailOtpType[] = ['email', 'magiclink', 'signup'];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL('/confirmar', url.origin);
  for (const key of ['token_hash', 'type', 'next']) {
    const value = url.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return NextResponse.redirect(target, 307);
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const failed = NextResponse.redirect(`${origin}/login?error=link`, 303);

  // Falla cerrado: sin encabezado Origin, o con uno de otro sitio, no se canjea nada.
  // (`same-site` cubre el paso kivoapp.app ↔ www.kivoapp.app.)
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!isKivoOrigin(request.headers.get('origin'), request.url) || (fetchSite !== null && fetchSite !== 'same-origin' && fetchSite !== 'same-site')) {
    return failed;
  }

  const form = await request.formData();
  const tokenHash = form.get('token_hash');
  const type = form.get('type');
  const next = form.get('next');
  if (typeof tokenHash !== 'string' || typeof type !== 'string' || !ALLOWED_TYPES.includes(type as EmailOtpType)) {
    return failed;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
  if (error || !data.user) {
    return failed;
  }
  return finalizeAuth(supabase, data.user, {
    origin,
    requestedPath: safeNextPath(typeof next === 'string' ? next : null, origin),
    phid: null,
    source: null,
    status: 303,
  });
}
