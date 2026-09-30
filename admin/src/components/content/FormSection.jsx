/**
 * Editor section — the structural unit of every content form.
 *
 * PRD §199 and DESTINATION.domain.contract.md §7: structured field-level sections,
 * styled using Card primitive with semantic headings.
 */

import Card from '../common/Card';

export default function FormSection({ title, description, children, actions, id }) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <Card as="section" variant="surface" pad="md" aria-labelledby={headingId}>
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 id={headingId} className="text-xs font-bold uppercase tracking-wider text-navy-950">
            {title}
          </h2>
          {description && <p className="mt-0.5 max-w-2xl text-xs text-slate-500">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}
