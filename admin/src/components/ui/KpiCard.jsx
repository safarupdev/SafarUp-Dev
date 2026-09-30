/**
 * KPI Metric Card — Exactly matching Image 2 specification.
 *
 * Layout:
 * - Rounded-2xl white card with subtle border & shadow
 * - Soft rounded icon chip on top left (e.g. clock, bell, shield)
 * - Metric label (slate-500 font-semibold)
 * - Big bold metric value (slate-900 font-bold)
 * - Trend percentage indicator (emerald green / rose with arrow)
 * - Info tooltip `?` in bottom right corner
 */

import Icon from '../common/Icon';

export default function KpiCard({
  label,
  value,
  icon = 'clock',
  trend = { value: '12%', direction: 'down' },
  tooltip = 'Metric calculated from real-time operational records',
  className = '',
}) {
  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-xs transition-all hover:shadow-sm hover:border-slate-300 ${className}`}
    >
      {/* Top Row: Icon Chip */}
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 shadow-2xs group-hover:scale-105 transition-transform">
          <Icon name={icon} className="h-4.5 w-4.5" />
        </div>
      </div>

      {/* Middle: Label & Big Bold Value */}
      <div className="mt-3.5">
        <p className="text-xs font-semibold text-slate-500 tracking-wide">{label}</p>
        <p className="mt-1 text-2xl sm:text-[1.75rem] font-bold tracking-tight text-slate-900 leading-none">
          {value}
        </p>
      </div>

      {/* Bottom Row: Trend Badge & Tooltip (?) */}
      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100/80 pt-2.5">
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-bold ${
              trend.direction === 'down' ? 'text-emerald-600' : 'text-emerald-600'
            }`}
          >
            <span>{trend.value}</span>
            <span className="text-[11px]">{trend.direction === 'down' ? '↓' : '↑'}</span>
          </div>
        )}

        {/* Info Tooltip `?` (Exact match to Image 2) */}
        <div
          title={tooltip}
          aria-label={tooltip}
          className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-help"
        >
          ?
        </div>
      </div>
    </div>
  );
}
