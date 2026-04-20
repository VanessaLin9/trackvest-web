/**
 * Inline SVG icons used by dashboard controls. Kept co-located with the
 * dashboard because none of these are general-purpose — a real icon set
 * would live under `components/ui/` with a Lucide-style API.
 */

export function LockIcon({ unlocked = false }: { unlocked?: boolean }) {
  if (unlocked) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 8V6.5a3.5 3.5 0 1 1 7 0" />
        <path d="M10 11v2.5" />
        <rect x="4.5" y="8" width="11" height="8" rx="2" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 8V6.5a3.5 3.5 0 1 1 7 0V8" />
      <path d="M10 11v2.5" />
      <rect x="4.5" y="8" width="11" height="8" rx="2" />
    </svg>
  )
}

export function ApplyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 10.5 8.2 13.7 15 7" />
    </svg>
  )
}
