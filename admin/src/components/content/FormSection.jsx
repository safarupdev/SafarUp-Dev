/**
 * Editor section — the structural unit of every content form.
 *
 * PRD §199 (principle) and DESTINATION.domain.contract.md §7: content is
 * edited as **structured field-level sections, never one giant text field**.
 * Each section renders a real heading so the form's document structure is
 * navigable (§3: semantic heading hierarchy is a discovery requirement).
 */

export default function FormSection({ title, description, children, actions, id }) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            {title}
          </h2>
          {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
