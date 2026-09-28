/**
 * Labeled input wrapper with inline validation error display.
 *
 * PRD §113 (Accessibility of Booking, generalized here to all forms):
 * booking/forms "must not depend exclusively on ... color alone" — errors
 * are shown as text, not just a red border, and every input has an
 * associated <label>.
 */

export default function FormField({ label, id, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
