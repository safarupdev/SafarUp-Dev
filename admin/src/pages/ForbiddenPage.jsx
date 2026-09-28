import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">403 — Access denied</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Your account does not have permission to view this page. If you believe this is a mistake,
        contact a Super Admin.
      </p>
      <Link to="/" className="text-sm text-brand-600 hover:text-brand-700">
        Back to dashboard
      </Link>
    </div>
  );
}
