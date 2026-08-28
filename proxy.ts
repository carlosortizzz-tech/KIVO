import { type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  return await updateSession(request, intlResponse);
}

export const config = {
  matcher: [
    // "icon" (app/icon.tsx, generado con next/og) no tiene extensión en su URL — sin excluirlo
    // acá, el middleware de next-intl lo trata como una página y lo redirige, rompiendo el
    // favicon en producción (encontrado al verificar el ícono nuevo el 2026-08-28).
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|api|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
