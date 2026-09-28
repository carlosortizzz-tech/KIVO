import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getPostHogServer } from '@/lib/posthog-server';
import { resolvePostAuthPath, sanitizePhid } from '@/lib/auth-redirect';

/**
 * Lo que pasa después de un inicio de sesión EXITOSO (Google, enlace del correo nuevo o enlace
 * PKCE): coser el funnel de PostHog, resincronizar el idioma, guardar el canal de origen (primer
 * toque) y decidir el destino. Un solo lugar para que /auth/callback y /auth/confirm no se
 * desincronicen. Nunca se llama sin un canje/verificación exitoso de ESTE enlace.
 *
 * `status`: 307 para GET (callback de Google/PKCE); 303 para el POST de /auth/confirm, para que el
 * navegador no repita el envío del formulario en la página de destino.
 */
export async function finalizeAuth(
  supabase: SupabaseClient,
  user: User,
  opts: { origin: string; requestedPath: string | null; phid: string | null; source: string | null; status?: 303 | 307 }
): Promise<NextResponse> {
  // Identidad anónima del onboarding: por URL (Google) o guardada en la cuenta al registrarse por
  // correo (crear-cuenta/page.tsx) — esta última sobrevive aunque el enlace se abra en otro
  // navegador, que es justo lo que hace el navegador interno de Instagram con el correo.
  const phid = sanitizePhid(opts.phid ?? (user.user_metadata?.phid as string | undefined));
  if (phid) {
    const ph = getPostHogServer();
    if (ph) {
      try {
        // La cuenta (user.id) es la identidad principal y la anónima del onboarding se le suma.
        // En este orden también funciona para quien YA estaba identificado de antes (PostHog no
        // deja fundir una identidad identificada DENTRO de otra, pero sí sumarle una anónima).
        ph.alias({ distinctId: user.id, alias: phid });
        await ph.flush(); // la función serverless puede terminar apenas se responda el redirect
      } catch (err) {
        // La analítica nunca debe impedir que alguien entre a su cuenta.
        console.error('posthog alias failed', err);
      }
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('locale, plan, paywall_seen_at')
    .eq('id', user.id)
    .maybeSingle();

  const path = resolvePostAuthPath({
    requestedPath: opts.requestedPath,
    plan: profile?.plan ?? null,
    paywallSeenAt: profile?.paywall_seen_at ?? null,
  });
  const response = NextResponse.redirect(`${opts.origin}${path}`, opts.status ?? 307);

  // El idioma vive en la cuenta (profiles.locale), no en el navegador — se resincroniza la
  // cookie de next-intl en cada login para que KIVO siempre hable el idioma del registro,
  // sin importar desde qué dispositivo o navegador entre el usuario.
  if (profile?.locale) {
    response.cookies.set('NEXT_LOCALE', profile.locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  }

  // Atribución por canal para Google OAuth (el registro por correo ya la guarda handle_new_user
  // desde la metadata). Pasa por una función de la base: los usuarios no tienen permiso de
  // escribir `source` directo — el UPDATE que había antes fallaba en silencio (0 de 3 cuentas de
  // Google tenían source). La función solo escribe si todavía está vacío (primer toque gana).
  if (opts.source) {
    const { error } = await supabase.rpc('set_profile_source', { p_source: opts.source });
    if (error) console.error('set_profile_source failed', error.message);
  }

  return response;
}
