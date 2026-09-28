import { useSyncExternalStore } from 'react';

// Navegadores internos de apps (Instagram, TikTok, Facebook…): Google bloquea su inicio de sesión
// ahí ("disallowed_useragent"), así que el botón de Google solo genera un error sin salida.
// Visto en producción el 2026-09-27: todo el tráfico de registro llegaba desde el de Instagram.
export function isInAppBrowser(ua: string): boolean {
  if (/Instagram|FBAN|FBAV|FB_IAB|musical_ly|TikTok|BytedanceWebview|Snapchat|Line\//i.test(ua)) return true;
  if (/; wv\)/.test(ua)) return true; // WebView genérico de Android
  // WebView de iOS: WebKit sin el token "Safari/" (Safari, Chrome y Firefox de iOS sí lo llevan).
  return /iPhone|iPad|iPod/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua);
}

const subscribeNever = () => () => {};

// El user agent no cambia durante la visita: se lee una vez en el cliente, y en el servidor se
// asume navegador normal (así el HTML inicial coincide y no hay error de hidratación).
export function useIsInAppBrowser(): boolean {
  return useSyncExternalStore(subscribeNever, () => isInAppBrowser(navigator.userAgent), () => false);
}
