/**
 * Admin dashboard — PRD §37 (Admin Dashboard).
 *
 * §37 KPIs: today's bookings, revenue, upcoming departures, seats sold,
 * seats available, pending private requests, pending payments,
 * cancellation requests. §37 charts: booking trend, revenue trend,
 * popular destinations, trip performance.
 *
 * None of these are wired to real data yet — the Booking, Payment,
 * Departure, and PrivateTripRequest models (PRD §54-58) do not exist in
 * the backend yet, so there is nothing to query. Per PRD §72 (Error
 * Handling: "Empty — meaningful empty states"), this renders honest
 * placeholders rather than fabricated numbers. Each card will be wired to
 * a real backend endpoint as soon as its underlying domain model and
 * aggregation route are built.
 */

import KpiCard from '../../components/ui/KpiCard';

const KPI_PLACEHOLDERS = [
  { label: "Today's Bookings", hint: 'Requires Booking model' },
  { label: 'Revenue', hint: 'Requires Payment model' },
  { label: 'Upcoming Departures', hint: 'Requires Departure model' },
  { label: 'Seats Sold', hint: 'Requires Departure model' },
  { label: 'Seats Available', hint: 'Requires Departure model' },
  { label: 'Pending Private Requests', hint: 'Requires PrivateTripRequest model' },
  { label: 'Pending Payments', hint: 'Requires Payment model' },
  { label: 'Cancellation Requests', hint: 'Requires Booking model' },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Operational overview — PRD §37. Live metrics will appear here once the trip, booking and
          payment modules are built.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_PLACEHOLDERS.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value="—" hint={kpi.hint} />
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-700">Charts coming soon</p>
        <p className="mt-1 text-sm text-slate-500">
          Booking trend, revenue trend, popular destinations and trip performance charts (PRD §37)
          will appear once bookings exist to chart.
        </p>
      </div>
    </div>
  );
}
