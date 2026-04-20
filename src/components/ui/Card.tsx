import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

/**
 * Outer page-level card shell.
 *
 * All pages previously open-coded
 * `rounded-Xxl border border-gray-200 bg-white p-5 shadow-sm` (with the
 * radius drifting between pages). This component standardises the shell on
 * `rounded-3xl` + `shadow-sm` and keeps padding configurable so callers don't
 * need to repeat the border/background classes.
 *
 * Nested / inline containers (the `rounded-2xl ...` boxes that live inside a
 * Card) intentionally stay as regular markup for now — they have too much
 * per-usage variation (dashed borders, amber/red tints, animations, etc.) to
 * collapse into a single primitive without losing fidelity.
 */

type CardPadding = 'none' | 'sm' | 'md' | 'lg'

const PADDING_STYLES: Record<CardPadding, string> = {
  none: '',
  sm: 'px-4 py-3',
  md: 'p-4',
  lg: 'p-5',
}

export type CardElement = 'div' | 'section' | 'article' | 'aside'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Underlying HTML tag. Defaults to `div`; use `section` for landmark regions. */
  as?: CardElement
  /** Inner padding preset. Defaults to `lg` (`p-5`) to match existing pages. */
  padding?: CardPadding
  children?: ReactNode
}

export function Card({
  as = 'div',
  padding = 'lg',
  className,
  children,
  ...rest
}: CardProps) {
  const Tag = as
  return (
    <Tag
      className={cn(
        'rounded-3xl border border-gray-200 bg-white shadow-sm',
        PADDING_STYLES[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
