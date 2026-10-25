'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isSensitiveAnalyticsUrl } from '@/lib/analytics-url';
import { initAnalytics, track } from '@/lib/analytics';
import { captureAttribution, getAttribution } from '@/lib/attribution';

// Página de inicio en cualquier idioma ("/", "/en", "/fr", "/ko"). Solo en ella se mide la visita.
const LANDING = /^\/(en|fr|ko)?\/?$/;
const cleanTag = (v: string | null) => (v && /^[a-z0-9_-]{1,40}$/i.test(v) ? v.toLowerCase() : null);

// Se monta en el layout raíz — corre en TODAS las pantallas, incluidas las anónimas
// (landing, onboarding, paywall) antes de que exista sesión.
export function AnalyticsInit() {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics();
    // Atribución por canal (36-ANALITICA-Y-EVENTOS.md): lee ?src=/?utm_source= de la URL con la
    // que entró (los 4 links cortos de KIVO ya la traen) ANTES de mandar app_abierta, para que
    // quede en el evento desde el primer toque — no solo guardada para después.
    captureAttribution();
    if (isSensitiveAnalyticsUrl(pathname)) return;
    // app_abierta: una sola vez en la vida del usuario (por navegador) — numerador de activación.
    if (!localStorage.getItem('kivo_app_abierta_v1')) {
      localStorage.setItem('kivo_app_abierta_v1', '1');
      track('app_abierta', { source: getAttribution() });
    }
  }, [pathname]);

  // landing_vista: cada visita a la página de inicio (a diferencia de app_abierta, que es una sola vez
  // por navegador). Sin esto las personas que entran y se van sin tocar nada no dejaban rastro y no se
  // podía saber cuántos clics del link de Instagram llegaban. No se manda la URL completa (otras páginas
  // llevan claves en la dirección): solo la etiqueta del link, su medio y el dominio de donde vino.
  useEffect(() => {
    if (!LANDING.test(pathname)) return;
    const p = new URLSearchParams(window.location.search);
    let referrerDominio = 'directo';
    try {
      if (document.referrer) referrerDominio = new URL(document.referrer).hostname;
    } catch {
      // referrer ilegible: se deja como "directo"
    }
    track('landing_vista', {
      utm_source: cleanTag(p.get('utm_source') ?? p.get('src')),
      utm_medium: cleanTag(p.get('utm_medium')),
      referrer_dominio: referrerDominio,
    });
  }, [pathname]);

  return null;
}
