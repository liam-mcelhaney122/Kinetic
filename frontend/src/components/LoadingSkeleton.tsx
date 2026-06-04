export function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4" aria-label="Loading workouts">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-xl bg-surface-container-low p-6 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="mb-8 flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-2.5 w-24 rounded-full bg-surface-container-high" />
              <div className="h-8 w-40 rounded bg-surface-container-high" />
            </div>
            <div className="h-11 w-11 rounded-full bg-surface-container-high" />
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-16 rounded-full bg-surface-container-high" />
            <div className="h-3 w-20 rounded-full bg-surface-container-high" />
          </div>
        </div>
      ))}
    </div>
  );
}
