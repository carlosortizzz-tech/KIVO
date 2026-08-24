'use client';

export default function ErrorRadar({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16">
      <div className="text-sm font-bold">No pudimos cargar tu Radar</div>
      <p className="text-[13px] text-text2 max-w-[28ch]">Puede ser un problema de conexión. Intenta de nuevo en un momento.</p>
      <button
        onClick={reset}
        className="bg-accent-btn text-white font-bold text-sm rounded-xl px-5 py-2.5 transition-transform duration-150 active:scale-[0.97]"
        style={{ boxShadow: 'var(--glow)' }}
      >
        Reintentar
      </button>
    </div>
  );
}
