export default function WorkspaceSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-150" aria-busy="true" aria-live="polite">
      <p className="sr-only">Restoring saved session...</p>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-zinc-800 animate-pulse shrink-0" />
          <div className="space-y-2">
            <div className="h-4 w-40 rounded-md bg-zinc-800 animate-pulse" />
            <div className="h-3 w-28 rounded-md bg-zinc-800/80 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-36 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="h-9 w-40 rounded-lg bg-zinc-800 animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="h-11 max-w-md w-full rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse" />
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-28 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="h-9 w-20 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="h-9 w-16 rounded-lg bg-zinc-800 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }, (_, index) => (
          <div
            key={index}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden"
          >
            <div className="h-9 border-b border-zinc-800/80 bg-zinc-950/40 px-3.5 flex items-center">
              <div className="h-3 w-10 rounded bg-zinc-800 animate-pulse" />
            </div>
            <div className="aspect-square bg-zinc-950 animate-pulse" />
            <div className="p-3.5 space-y-2">
              <div className="h-3.5 w-3/4 rounded bg-zinc-800 animate-pulse" />
              <div className="h-3 w-12 rounded bg-zinc-800/80 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
