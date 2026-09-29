/**
 * Page header for a content screen — title, description, and actions.
 *
 * PRD §3 (Design System): one Display-level heading per page, with no skipped
 * levels. The description line is the natural place for the PRD reference a
 * content editor needs, since the admin UI is dense and assumes staff context.
 */

import { Link } from 'react-router-dom';

export default function PageHeader({ title, description, actions, backTo, backLabel = 'Back' }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="text-sm text-brand-600 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            &larr; {backLabel}
          </Link>
        )}
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </div>
  );
}
