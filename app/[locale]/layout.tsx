import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Onest } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { LocaleSwitcher } from "@/components/app/LocaleSwitcher";
import { AnalyticsInit } from "@/components/app/AnalyticsInit";
import "../globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
    // El <link rel="manifest"> lo agrega Next solo a partir de app/manifest.ts.
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "KIVO",
    },
  };
}

// Color de la barra del sistema al abrir KIVO instalada: va en `viewport` (en `metadata` Next lo
// ignora). Debe ser un valor literal, no un token CSS — es el mismo fondo de app/manifest.ts.
export const viewport: Viewport = {
  themeColor: "#0B0710",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${bricolage.variable} ${onest.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg text-text antialiased">
        {/* Red de seguridad mientras Sentry carga diferido (ver instrumentation-client.ts): sin
            costo de bundle (es un script plano, no una librería), guarda cualquier error que
            ocurra ANTES de que Sentry esté listo para que no se pierda — Sentry los recoge apenas
            termina de inicializar. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__kivoEarlyErrors=[];window.addEventListener('error',function(e){window.__kivoEarlyErrors.push({message:e.message,stack:e.error&&e.error.stack,filename:e.filename,lineno:e.lineno})});window.addEventListener('unhandledrejection',function(e){var r=e.reason;window.__kivoEarlyErrors.push({message:'Unhandled rejection: '+(r&&r.message?r.message:String(r)),stack:r&&r.stack})});`,
          }}
        />
        <NextIntlClientProvider>
          <AnalyticsInit />
          {children}
          <LocaleSwitcher />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
