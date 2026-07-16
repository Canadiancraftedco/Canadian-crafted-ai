'use client';

/**
 * Button — the single source of truth for every clickable action in the app.
 *
 * Props:
 *   variant: 'primary' | 'secondary' | 'ghost' | 'danger'   (default 'secondary')
 *   size: 'sm' | 'md' | 'lg'                                 (default 'md')
 *   loading: boolean — shows a spinner, disables interaction, keeps layout stable
 *   disabled: boolean
 *   as: 'button' | 'a' — renders an <a> when you pass href, or force with as="a"
 *   href: string — if present, renders as a link styled identically to a button
 *   fullWidth: boolean
 *   children: ReactNode
 *   ...rest — spread onto the underlying element (onClick, type, aria-*, target, etc.)
 *
 * Accessibility:
 *   - Uses a real <button> or <a> (never a styled <div>), so it's keyboard-operable
 *     and reachable by screen readers/tab order for free.
 *   - loading sets aria-busy and disables the control without removing it from the
 *     tab order silently (disabled attribute still communicates state correctly).
 *   - Visible focus ring via :focus-visible in globals.css — never suppressed here.
 *
 * Usage:
 *   <Button variant="primary" onClick={save} loading={saving}>Save changes</Button>
 *   <Button variant="danger" size="sm" onClick={remove}>Delete</Button>
 *   <Button href="https://example.com" target="_blank" rel="noopener noreferrer">Visit →</Button>
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  as,
  href,
  fullWidth = false,
  children,
  className = '',
  ...rest
}) {
  const Tag = href || as === 'a' ? 'a' : 'button';
  const classes = ['btn', `btn-${variant}`, `btn-${size}`, fullWidth ? 'btn-full' : '', className]
    .filter(Boolean)
    .join(' ');

  const isDisabled = disabled || loading;

  return (
    <Tag
      className={classes}
      href={href}
      disabled={Tag === 'button' ? isDisabled : undefined}
      aria-disabled={Tag === 'a' ? isDisabled : undefined}
      aria-busy={loading || undefined}
      onClick={isDisabled && Tag === 'a' ? (e) => e.preventDefault() : rest.onClick}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      <span className={loading ? 'btn-label-loading' : undefined}>{children}</span>
    </Tag>
  );
}
