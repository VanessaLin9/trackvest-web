/**
 * Tiny className joiner. Filters out falsy values so conditional classes like
 *
 *   cn('base', isActive && 'bg-blue-600')
 *
 * stay concise without pulling in a `clsx` dependency.
 */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(' ')
}
