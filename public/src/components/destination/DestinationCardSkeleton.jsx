/**
 * Destination card skeleton.
 *
 * DESIGN_SYSTEM.md §10: skeletons, not spinners, for content that is known to
 * arrive. The boxes match the real card's geometry exactly, so the page does
 * not reflow when the data lands (§10: no layout shift on load).
 */

export default function DestinationCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-navy-100 shadow-card" aria-hidden="true">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="flex flex-col gap-3 p-5">
        <div className="skeleton h-3 w-24 rounded-full" />
        <div className="skeleton h-5 w-3/4 rounded-md" />
        <div className="skeleton h-3.5 w-full rounded" />
        <div className="skeleton h-3.5 w-5/6 rounded" />
        <div className="mt-1 flex gap-1.5 pt-1">
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
