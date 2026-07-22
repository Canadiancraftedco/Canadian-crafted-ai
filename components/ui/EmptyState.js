/**
 * EmptyState — consistent "nothing here" / error messaging.
 * Replaces every hand-rolled `<div className="empty-state">...</div>` in the app.
 *
 * Props:
 *   title: string — short headline (e.g. "No products yet")
 *   description: string — one line of supporting detail (optional)
 *   action: ReactNode — optional action, typically a <Button>
 *   tone: 'default' | 'error'  (default 'default') — error tone tints the text
 *
 * Usage:
 *   <EmptyState title="No verified products yet" description="The discovery agent is still working on it." />
 *   <EmptyState tone="error" title="Couldn't load products" action={<Button onClick={retry}>Retry</Button>} />
 */
export default function EmptyState({ title, description, action, tone = 'default' }) {
  return (
    <div className={`empty-state-block ${tone === 'error' ? 'empty-state-error' : ''}`} role={tone === 'error' ? 'alert' : undefined}>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-desc">{description}</div>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
