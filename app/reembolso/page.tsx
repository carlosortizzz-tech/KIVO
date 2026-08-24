import Link from 'next/link';

export default function PrivacidadPage() {
  return (
    <div className="max-w-[420px] mx-auto w-full min-h-dvh flex flex-col items-center justify-center text-center gap-5 px-5">
      <h1 className="font-display text-xl font-extrabold">Política de Reembolso — pendiente</h1>
      <p className="text-sm text-text2 leading-relaxed">Esta página se redacta antes de que KIVO esté lista para vender. Por ahora es un placeholder para que el enlace del footer no quede roto.</p>
      <Link href="/" className="text-accent2 font-bold text-sm border-2 border-accent rounded-2xl px-5 py-3" style={{ boxShadow: 'var(--glow)' }}>← Volver al inicio</Link>
    </div>
  );
}
