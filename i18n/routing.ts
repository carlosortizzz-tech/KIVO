import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en', 'fr', 'ko'],
  defaultLocale: 'es',
  // 'as-needed': español (default) va SIN prefijo (/onboarding), el resto CON
  // prefijo (/en/onboarding, /fr/onboarding, /ko/onboarding).
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
