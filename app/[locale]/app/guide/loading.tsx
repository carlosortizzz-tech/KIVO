export default function LoadingGuide() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-16 bg-surface rounded mb-2" />
      <div className="h-5 w-52 bg-surface rounded mb-4" />
      <div className="h-11 bg-surface rounded-[var(--radius-card)] mb-2.5" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}
