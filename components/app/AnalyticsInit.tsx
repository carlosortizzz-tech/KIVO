'use client';

import { useEffect } from 'react';
import { initAnalytics, track } from '@/lib/analytics';

// Se monta en el layout raíz — corre en TODAS las pantallas, incluidas las anónimas
// (landing, onboarding, paywall) antes de que exista sesión.
export function AnalyticsInit() {
  useEffect(() => {
    initAnalytics();
    // app_abierta: una sola vez en la vida del usuario (por navegador) — numerador de activación.
    if (!localStorage.getItem('kivo_app_abierta_v1')) {
      localStorage.setItem('kivo_app_abierta_v1', '1');
      track('app_abierta', {});
    }
  }, []);
  return null;
}
