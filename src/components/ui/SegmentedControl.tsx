import { cn } from './cn'

/**
 * Pill-style toggle used for switching between a small set of mutually
 * exclusive options (display currency mode, allocation view, ...).
 *
 * Two orthogonal tone props control the look:
 *   - `tone`          pill color (active fill + inactive text + hover)
 *   - `containerTone` outer track border + background
 *
 * The `slate`/`amber` split covers every callsite in the dashboard today.
 * Keep the palette list small and expand deliberately; wild-grown tones are
 * why we ended up refactoring these buttons in the first place.
 */

type Tone = 'slate' | 'amber'

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Pill tone (active fill + inactive text + hover). Defaults to `slate`. */
  tone?: Tone
  /** Container tone (border + background). Defaults to `slate`. */
  containerTone?: Tone
  /** Extra classes applied to the outer container. */
  className?: string
}

const CONTAINER_STYLES: Record<Tone, string> = {
  slate: 'border-slate-200 bg-slate-50',
  amber: 'border-amber-200 bg-white',
}

const PILL_ACTIVE_STYLES: Record<Tone, string> = {
  slate: 'bg-slate-900 text-white',
  amber: 'bg-amber-500 text-white',
}

// Inactive hover color depends on both the pill tone and the container
// background (hover needs to contrast with the container). Enumerating the
// four combos is explicit and cheap.
const PILL_INACTIVE_STYLES: Record<`${Tone}-${Tone}`, string> = {
  'slate-slate': 'text-slate-700 hover:bg-white',
  'slate-amber': 'text-slate-700 hover:bg-slate-50',
  'amber-slate': 'text-amber-900 hover:bg-amber-50',
  'amber-amber': 'text-amber-900 hover:bg-amber-50',
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'slate',
  containerTone = 'slate',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex rounded-full border p-1',
        CONTAINER_STYLES[containerTone],
        className,
      )}
      role="group"
    >
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition',
              isActive
                ? PILL_ACTIVE_STYLES[tone]
                : PILL_INACTIVE_STYLES[`${tone}-${containerTone}`],
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
