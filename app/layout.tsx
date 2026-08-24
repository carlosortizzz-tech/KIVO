import type { Metadata } from "next";
import { Bricolage_Grotesque, Onest } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "KIVO — Nunca más te pierdas una preventa de BTS",
  description: "KIVO junta Weverse, Bubble y todas las fuentes en un solo calendario para el ARMY internacional. No afiliado a HYBE.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${bricolage.variable} ${onest.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
