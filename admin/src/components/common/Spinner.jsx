export default function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600"
          role="status"
          aria-label={label}
        />
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
