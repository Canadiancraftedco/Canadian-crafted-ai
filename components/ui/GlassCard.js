/**
 * GlassCard — the frosted-glass panel used for every card/panel in the app.
 *
 * Props:
 *   as: element type to render (default 'div'; pass 'a' + href for clickable cards)
 *   interactive: boolean — adds hover lift + pointer cursor (default false)
 *   glow: 'lake' | 'ember' | null — optional ambient glow shadow
 *   holo: boolean — adds a subtle neon holographic sheen on hover (default false)
 *   padding: 'none' | 'sm' | 'md' | 'lg'  (default 'md')
 *   children, className, ...rest — spread onto the element
 *
 * Usage:
 *   <GlassCard padding="lg" glow="lake">...</GlassCard>
 *   <GlassCard as="a" href="/outdoors" interactive holo>Outdoors →</GlassCard>
 */
export default function GlassCard({
  as: Tag = 'div',
  interactive = false,
  glow = null,
  holo = false,
  padding = 'md',
  children,
  className = '',
  ...rest
}) {
  const classes = [
    'glass',
    'glass-card',
    `glass-pad-${padding}`,
    interactive ? 'glass-interactive' : '',
    holo ? 'glass-holo' : '',
    glow ? `glow-${glow}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...rest}>
      {holo && <span className="glass-holo-sheen" aria-hidden="true" />}
      {children}
    </Tag>
  );
}
