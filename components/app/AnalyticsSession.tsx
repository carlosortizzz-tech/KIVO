'use client';

import { useEffect } from 'react';
import { identifyUser, track } from '@/lib/analytics';

// Se monta en el layout de /app (usuario ya logueado) — cose la identidad y cuenta el día activo.
export function AnalyticsSession({ userId, plan, diasDesdeAlta }: { userId: string; plan: string; diasDesdeAlta: number }) {
  useEffect(() => {
    identifyUser(userId, plan, 'directo');

    // sesion_iniciada: una vez por día activo — base de las curvas D1/D7/D30.
    const hoy = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('kivo_analytics_last_session') !== hoy) {
      localStorage.setItem('kivo_analytics_last_session', hoy);
      track('sesion_iniciada', { plan, dias_desde_alta: diasDesdeAlta });
    }

    // aha_alcanzado: primera vez que el usuario llega a la app real (Radar) tras registrarse —
    // es la primera victoria de KIVO (ver la promesa central en la Constitución del Producto).
    if (!localStorage.getItem('kivo_aha_v1')) {
      localStorage.setItem('kivo_aha_v1', '1');
      track('aha_alcanzado', {});
    }
  }, [userId, plan, diasDesdeAlta]);
  return null;
}
