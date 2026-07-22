/**
 * Badge — small status pill. Used for verification status, post status,
 * affiliate status, anywhere you'd otherwise hand-roll a colored label.
 *
 * Props:
 *   tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'  (default 'neutral')
 *   children: ReactNode
 *
 * Usage:
 *   <Badge tone="success">Verified</Badge>
 *   <Badge tone="warning">Pending review</Badge>
 */
const TONE_CLASS = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

export default function Badge({ tone = 'neutral', children, className = '' }) {
  return <span className={`badge mono ${TONE_CLASS[tone] || TONE_CLASS.neutral} ${className}`}>{children}</span>;
}
