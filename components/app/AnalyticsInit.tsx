'use client';

import { useEffect } from 'react';
import { initAnalytics, track } from '@/lib/analytics';
import { captureAttribution, getAttribution } from '@/lib/attribution';

// Se monta en el layout raíz — corre en TODAS las pantallas, incluidas las anónimas
// (landing, onboarding, paywall) antes de que exista sesión.
export function AnalyticsInit() {
  useEffect(() => {
    initAnalytics();
    // Atribución por canal (36-ANALITICA-Y-EVENTOS.md): lee ?src=/?utm_source= de la URL con la
    // que entró (los 4 links cortos de KIVO ya la traen) ANTES de mandar app_abierta, para que
    // quede en el evento desde el primer toque — no solo guardada para después.
    captureAttribution();
    // app_abierta: una sola vez en la vida del usuario (por navegador) — numerador de activación.
    if (!localStorage.getItem('kivo_app_abierta_v1')) {
      localStorage.setItem('kivo_app_abierta_v1', '1');
      track('app_abierta', { source: getAttribution() });
    }
  }, []);
  return null;
}
