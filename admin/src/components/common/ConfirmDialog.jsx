/**
 * Confirmation dialog — DESIGN_SYSTEM §6 (Overlays: Dialog) and §9.
 *
 * This exists because publish / unpublish / archive / feature are
 * **consequential**: each one changes what the public internet can see
 * (API.destination.contract.md §3). The dialog states the consequence in
 * plain words, names the record being acted on, and requires a deliberate
 * second click. Nothing is called until `onConfirm` fires.
 *
 * Accessibility: labelled dialog, Escape cancels, focus moves to Cancel (the safe
 * action) on open, and focus returns to the trigger on close.
 * Motion respects `prefers-reduced-motion` (DESIGN_SYSTEM §8).
 */

import { useEffect, useRef } from 'react';
import Button from '../ui/Button';

export default function ConfirmDialog({
  open,
  title,
  description,
  consequence,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  isConfirming = false,
  onConfirm,
  onCancel,
}) {
  const initialFocusRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Focus handling is keyed on `open` alone. Tying it to `isConfirming` would
  // yank focus back to the trigger the moment the request starts.
  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    initialFocusRef.current?.focus();

    return () => {
      const previous = previouslyFocused.current;
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      // Escape must not abort a request that is already in flight — the
      // outcome has to be reported either way.
      if (event.key === 'Escape' && !isConfirming) {
        event.stopPropagation();
        onCancel();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, isConfirming, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={isConfirming ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
        className="relative w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg"
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-slate-900">
          {title}
        </h2>

        <div id="confirm-dialog-body" className="mt-2 flex flex-col gap-2">
          {description && <p className="text-sm text-slate-700">{description}</p>}
          {consequence && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{consequence}</p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button ref={initialFocusRef} variant="ghost" onClick={onCancel} disabled={isConfirming}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} isLoading={isConfirming}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
