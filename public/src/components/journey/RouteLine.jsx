/**
 * RouteLine — the multi-location device (journey-first product model).
 *
 * A SafarUp trip is a COMPLETE journey, not a destination. This renders the
 * journey's ordered `route` as connected markers so a trip visibly spans
 * several locations instead of reading as one place.
 *
 * `role` drives the treatment, and it is the whole point:
 *   start     filled marker — where the journey begins
 *   overnight distinct glyph — where the traveller sleeps
 *   return    outlined marker — where the journey loops back
 *   stop      small neutral dot
 *
 * The markers are decorative; `tripRouteDescription()` supplies the accessible
 * name, so a screen reader hears the route in words rather than reading a row
 * of decorative dots.
 *
 * Tokens and icon names used here are all verified to exist in this repo's
 * Tailwind config and Icon set. A typo in either renders as nothing at all
 * rather than failing loudly, so keep this list conservative.
 */

import { tripRouteDescription, tripRouteSummary } from '../../data/showcase';
import Icon from '../common/Icon';

const SIZES = {
  sm: {
    dot: 'h-2.5 w-2.5',
    line: 'h-px w-4 sm:w-6',
    text: 'text-[0.7rem]',
    gap: 'gap-1.5',
    overnight: 'h-5 w-5',
  },
  md: {
    dot: 'h-3.5 w-3.5',
    line: 'h-0.5 w-8 sm:w-12',
    text: 'text-xs',
    gap: 'gap-2',
    overnight: 'h-6 w-6',
  },
  lg: {
    dot: 'h-5 w-5',
    line: 'h-1 w-12 sm:w-16',
    text: 'text-sm',
    gap: 'gap-3',
    overnight: 'h-8 w-8',
  },
};

function Marker({ leg, size }) {
  if (leg.role === 'overnight') {
    return (
      <span
        className={`flex ${size.overnight} flex-none items-center justify-center rounded-full bg-accent-700 text-white ring-4 ring-accent-100`}
      >
        <Icon name="home" className="h-1/2 w-1/2" />
      </span>
    );
  }

  if (leg.role === 'start') {
    return <span className={`${size.dot} flex-none rounded-full bg-accent-700 ring-4 ring-accent-100`} />;
  }

  if (leg.role === 'return') {
    // Outlined, and carrying a return affordance, so the loop back is legible
    // without relying on colour alone.
    return (
      <span
        className={`${size.dot} flex-none rounded-full border-2 border-navy-700 bg-white ring-4 ring-navy-100`}
      />
    );
  }

  return <span className={`${size.dot} flex-none rounded-full bg-navy-400`} />;
}

export default function RouteLine({ route, size = 'md', tone = 'light', className = '' }) {
  if (!Array.isArray(route) || route.length === 0) return null;

  const s = SIZES[size] ?? SIZES.md;
  const isDark = tone === 'dark';
  const label = isDark ? 'text-white/85' : 'text-navy-700';
  const connector = isDark ? 'bg-white/35' : 'bg-navy-200';
  const returnText = isDark ? 'text-white/60' : 'text-navy-500';

  return (
    <div className={className}>
      <p className="sr-only">{tripRouteDescription({ route })}</p>

      <ol
        aria-hidden="true"
        className={`flex flex-wrap items-center ${s.gap} ${s.text} font-semibold`}
      >
        {route.map((leg, index) => (
          <li key={`${leg.name}-${leg.role}-${index}`} className="flex items-center">
            {index > 0 ? <span className={`${s.line} ${connector} mx-1.5 flex-none rounded-full`} /> : null}
            <Marker leg={leg} size={s} />
            <span
              className={`ml-1.5 whitespace-nowrap ${leg.role === 'return' ? returnText : label}`}
            >
              {leg.name}
            </span>
            {leg.role === 'overnight' ? (
              <span className={`ml-1 whitespace-nowrap ${isDark ? 'text-accent-300' : 'text-accent-700'}`}>
                overnight
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Text form of the route, for places that cannot fit the markers — a metadata
 * row, a card footer. Exported so callers do not re-join the names themselves
 * and end up with a different separator than the one the UI uses.
 */
export { tripRouteSummary };
