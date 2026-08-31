// Sentry se inicializa desde `components/app/SentryInit.tsx`, no acá. Este archivo especial
// (convención de Next.js) siempre se empaqueta en el chunk inicial de la página, sin importar
// cómo se escriba el import() adentro -- confirmado midiendo el bundle real en producción, con
// y sin `bundleSizeOptimizations` de Sentry (esas optimizaciones tampoco aplican bajo Turbopack,
// el bundler por defecto de Next 16 -- limitación documentada del plugin de Sentry, no una
// configuración faltante). Cargar el SDK desde un componente cliente normal, montado tras la
// hidratación, sí permite que el bundler lo separe en su propio chunk diferido de verdad
// (38-PERFORMANCE-BUDGET).
export {};
