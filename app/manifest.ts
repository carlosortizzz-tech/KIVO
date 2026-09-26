import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KIVO — Tu compañero ARMY",
    short_name: "KIVO",
    description:
      "Calendario de eventos, guías paso a paso y comunidad para no perderte ninguna apertura de tickets, comeback o membresía de BTS.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0710",
    theme_color: "#0B0710",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
