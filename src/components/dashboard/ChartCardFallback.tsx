import { Card } from '../ui/Card'

interface ChartCardFallbackProps {
  title: string
  description: string
  /** Tailwind height class for the skeleton body, e.g. `h-72` or `h-80`. */
  heightClass?: string
}

/**
 * Placeholder shown while a lazy-loaded chart card is being fetched. Mirrors
 * the outer shell of the real chart cards so the layout doesn't reflow when
 * the actual component mounts.
 */
export function ChartCardFallback({
  title,
  description,
  heightClass = 'h-72',
}: ChartCardFallbackProps) {
  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className={`rounded-2xl bg-gray-50 ${heightClass} animate-pulse`} />
    </Card>
  )
}
