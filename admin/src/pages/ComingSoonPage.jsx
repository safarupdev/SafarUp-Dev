/**
 * Coming Soon Placeholder — PRD §36.
 *
 * Renders honest placeholder state for reserved PRD sections without dead links.
 */

import { useLocation } from 'react-router-dom';
import Card from '../components/common/Card';
import Icon from '../components/common/Icon';
import LinkButton from '../components/ui/LinkButton';

export default function ComingSoonPage() {
  const location = useLocation();

  return (
    <div className="py-8">
      <Card variant="inset" pad="lg" className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
          <Icon name="calendar" className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-navy-950 sm:text-lg">Module Scheduled for Implementation</h2>
        <code className="mt-1.5 rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-brand-700">
          {location.pathname}
        </code>
        <p className="mt-3 max-w-md text-xs sm:text-sm text-slate-500">
          This route is reserved per PRD §36 (Admin Navigation). Implementation is queued for its designated phase once the backend domain models and persistence contracts are ratified.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <LinkButton to="/" variant="primary" size="sm">
            Return to Dashboard
          </LinkButton>
          <LinkButton to="/destinations" variant="secondary" size="sm">
            Manage Destinations
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
