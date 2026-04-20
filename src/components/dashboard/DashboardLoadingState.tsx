/**
 * Full-page skeleton shown while the first batch of dashboard queries is
 * in flight. Layout mirrors the real dashboard (hero + 4 KPIs + 2-column
 * body) so the jump when data arrives is minimal.
 */
export function DashboardLoadingState() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="h-64 animate-pulse rounded-[2rem] bg-slate-100" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-3xl bg-slate-100"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    </div>
  )
}
