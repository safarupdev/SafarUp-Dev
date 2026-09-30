/**
 * Page Header — PRD §34 & §116.
 *
 * Consistent heading hierarchy, contextual description, back navigation, and primary actions.
 */

import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function PageHeader({ title, description, actions, backTo, backLabel = 'Back' }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200/80 pb-4">
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            <Icon name="chevronDown" className="h-3.5 w-3.5 rotate-90" />
            <span>{backLabel}</span>
          </Link>
        )}
        <h1 className="text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-xs sm:text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2 self-start sm:self-center">{actions}</div>}
    </div>
  );
}
