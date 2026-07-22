'use client';

import { useId } from 'react';

/**
 * Input — text/number/etc. field with a properly associated label and error state.
 *
 * Props:
 *   label: string — visible label (always rendered; never rely on placeholder alone)
 *   error: string — validation message; sets aria-invalid + aria-describedby automatically
 *   hint: string — helper text shown when there's no error
 *   required: boolean — adds a visual + aria-required marker
 *   as: 'input' | 'textarea' — renders a textarea when needed
 *   ...rest — spread onto the underlying element (type, value, onChange, placeholder, etc.)
 *
 * Accessibility:
 *   - label uses htmlFor/id (via useId, so it's unique even with multiple instances)
 *   - error/hint text is linked via aria-describedby so screen readers announce it
 *   - invalid state is exposed via aria-invalid, not just a red border
 *
 * Usage:
 *   <Input label="Product name" value={name} onChange={(e) => setName(e.target.value)} required />
 *   <Input label="Description" as="textarea" error={errors.description} />
 */
export default function Input({ label, error, hint, required = false, as = 'input', className = '', id, ...rest }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const describedById = error || hint ? `${inputId}-desc` : undefined;
  const Tag = as;

  return (
    <div className={`field ${className}`}>
      {label && (
        <label htmlFor={inputId} className="field-label mono">
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      <Tag
        id={inputId}
        className={`field-input ${error ? 'field-input-error' : ''}`}
        aria-invalid={!!error || undefined}
        aria-required={required || undefined}
        aria-describedby={describedById}
        {...rest}
      />
      {(error || hint) && (
        <div id={describedById} className={`field-desc ${error ? 'field-desc-error' : ''}`}>
          {error || hint}
        </div>
      )}
    </div>
  );
}
