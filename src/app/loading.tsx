export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-surface" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
            <div className="aspect-[2/3] w-full animate-pulse bg-surface-2" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-2" />
              <div className="h-7 w-full animate-pulse rounded-full bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
