'use client';

import { useEffect, useRef } from 'react';

/**
 * Modal — accessible dialog overlay. Used for add/edit forms and confirmations.
 *
 * Props:
 *   open: boolean — controls visibility (component returns null when false)
 *   onClose: () => void — called on Escape key, backdrop click, or close button
 *   title: string — rendered as the dialog's accessible name (aria-labelledby)
 *   children: ReactNode
 *   maxWidth: number in px (default 480)
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true" + aria-labelledby pointing at the title
 *   - Escape key closes it
 *   - Focus moves into the dialog on open, and to the first focusable element
 *   - Backdrop click closes it, but clicks inside the panel don't bubble to the backdrop
 *   - Does not scroll-lock the body — acceptable tradeoff for this app's size;
 *     for a larger app, add a body-scroll-lock here.
 *
 * Usage:
 *   <Modal open={showForm} onClose={() => setShowForm(false)} title="Add product">
 *     <form>...</form>
 *   </Modal>
 */
export default function Modal({ open, onClose, title, children, maxWidth = 480 }) {
  const panelRef = useRef(null);
  const titleId = 'modal-title';

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKeyDown);

    // move focus into the dialog for keyboard/screen-reader users
    const firstFocusable = panelRef.current?.querySelector('input, textarea, select, button, a[href]');
    firstFocusable?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="modal-panel glass"
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">{title}</h2>
          <button onClick={onClose} className="modal-close" aria-label="Close dialog">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
