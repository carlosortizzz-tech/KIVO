export default function LoadingRadar() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 bg-surface rounded mb-2" />
      <div className="h-5 w-40 bg-surface rounded mb-4" />
      <div className="h-[190px] bg-surface rounded-2xl mb-4" />
      <div className="flex gap-1.5 mb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 h-14 bg-surface rounded-[10px]" />
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
