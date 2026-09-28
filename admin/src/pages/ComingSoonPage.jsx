/**
 * Placeholder for §36 nav sections whose domain models/pages have not
 * been built yet. Exists so the sidebar accurately reflects the full PRD
 * navigation structure without linking to a broken/blank page.
 */

import { useLocation } from 'react-router-dom';

export default function ComingSoonPage() {
  const location = useLocation();

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-16 text-center">
      <p className="text-sm font-medium text-slate-700">This section is not built yet</p>
      <p className="mt-1 text-sm text-slate-500">{location.pathname}</p>
      <p className="mt-4 max-w-md text-sm text-slate-400">
        This route is reserved per the PRD navigation structure (§36) and will be implemented once
        its corresponding backend domain model is ready.
      </p>
    </div>
  );
}
