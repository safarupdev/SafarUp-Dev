import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">404 — Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link to="/" className="text-sm text-brand-600 hover:text-brand-700">
        Back to dashboard
      </Link>
    </div>
  );
}
