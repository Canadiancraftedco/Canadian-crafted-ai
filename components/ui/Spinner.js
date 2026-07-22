/**
 * Spinner — small inline loading indicator (the pulsing dot used across the app).
 * Purely decorative, so aria-hidden by default; pair it with visible or sr-only text
 * describing what's loading (e.g. "Searching…") for accessibility.
 *
 * Usage:
 *   <Spinner /> Searching…
 */
export function Spinner({ className = '' }) {
  return <span className={`dot pulsing ${className}`} aria-hidden="true" />;
}

/**
 * Select — labeled dropdown, same contract as Input for consistency.
 *
 * Props:
 *   label, error, hint, required — same as Input
 *   options: [{ value, label }] | string[]
 *   ...rest — spread onto the <select>
 *
 * Usage:
 *   <Select label="Category" options={['outdoors','health']} value={category} onChange={handleChange} />
 */
import { useId } from 'react';

export function Select({ label, error, hint, required = false, options = [], className = '', id, ...rest }) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const describedById = error || hint ? `${selectId}-desc` : undefined;

  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

  return (
    <div className={`field ${className}`}>
      {label && (
        <label htmlFor={selectId} className="field-label mono">
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`field-input ${error ? 'field-input-error' : ''}`}
        aria-invalid={!!error || undefined}
        aria-required={required || undefined}
        aria-describedby={describedById}
        {...rest}
      >
        {normalized.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {(error || hint) && (
        <div id={describedById} className={`field-desc ${error ? 'field-desc-error' : ''}`}>
          {error || hint}
        </div>
      )}
    </div>
  );
}
