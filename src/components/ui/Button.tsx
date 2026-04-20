import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

/**
 * Reusable action button.
 *
 * Three visual variants cover the vast majority of callers:
 *   - `primary`   filled blue (default submit/CTA)
 *   - `secondary` outlined neutral (cancel, refresh, pagination)
 *   - `dark`      filled slate (secondary CTA, e.g. CSV import)
 *
 * Disabled state is unified across all variants as `opacity-60` +
 * `cursor-not-allowed` so every spinner / pending state looks the same.
 * Callers that need a different disabled look can still pass Tailwind
 * overrides through `className`.
 *
 * Note: `type` defaults to `'button'` to avoid the common bug of a stray
 * button submitting its enclosing form. Use `type="submit"` explicitly when
 * that's what you want.
 */

type ButtonVariant = 'primary' | 'secondary' | 'dark'
type ButtonSize = 'sm' | 'md' | 'icon'

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  dark: 'bg-slate-900 text-white hover:bg-slate-700',
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm font-medium',
  md: 'px-4 py-2 text-sm font-medium',
  icon: 'p-1.5',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded transition disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      {...rest}
    />
  )
}
