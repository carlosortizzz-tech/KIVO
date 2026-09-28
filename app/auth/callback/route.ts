import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { finalizeAuth } from '@/lib/auth-finalize';
import { safeNextPath } from '@/lib/auth-redirect';

// Canje PKCE (`?code=`): Google OAuth, y los enlaces de correo mientras las plantillas de Supabase
// sigan en el formato viejo (o los que ya estén en bandejas de entrada). El enlace de correo nuevo
// pasa por /auth/confirm — ver ahí el porqué.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      return finalizeAuth(supabase, data.user, {
        origin,
        // `next` se valida: antes se concatenaba tal cual a la URL de redirección (open redirect
        // con valores como "@otro-dominio.com").
        requestedPath: safeNextPath(searchParams.get('next'), origin),
        phid: searchParams.get('phid'),
        source: searchParams.get('source'),
      });
    }
  }

  // Sin un canje exitoso de ESTE enlace no se sigue con ninguna sesión que el navegador ya tuviera
  // (podría ser de otra cuenta): se explica que el enlace falló y se ofrece pedir otro.
  return NextResponse.redirect(`${origin}/login?error=link`);
}
