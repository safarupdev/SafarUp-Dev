/**
 * ItineraryTimeline — the flagship element of Trip Detail.
 *
 * The journey is the product, so the day-by-day plan is the centre of the page
 * rather than one section among many. Three things make it read as ONE journey
 * instead of a list of unrelated stops:
 *
 *   1. A single continuous rail runs through every day. There is no per-day
 *      card border pretending each day is a separate product.
 *   2. A day that sleeps shows an explicit OVERNIGHT row at its end, so
 *      "where do we stay" is answerable without inference.
 *   3. The final day shows an explicit RETURN row, so "where does this end"
 *      is answerable without inference.
 *
 * Progressive disclosure: collapsed days are a single large tappable row
 * showing the day number, the location and a one-line summary. That keeps a
 * four-day journey scannable on a phone while the detail stays one tap away.
 *
 * All content is read from the trip's own `itinerary`; nothing here invents a
 * stop, a time or a distance.
 */

import { useState } from 'react';

import Icon from '../common/Icon';

const STOP_ROLE_LABEL = {
  start: 'Departure',
  overnight: 'Evening arrival and overnight',
  return: 'Return and drop',
};

/**
 * A stop's role comes from the DAY it sits in, not from its own text.
 *
 * The previous version substring-matched English prose on `stop.name`, which
 * meant it fired on roughly one stop in thirty-two, could never match the
 * phrases it was looking for (they live in `stop.description`, not `name`), and
 * would throw a TypeError on an unnamed stop. The itinerary already states the
 * facts structurally: the first stop is at the day's start location, the last
 * ends at the day's end location, and `stop.overnight` marks the sleep.
 */
function stopRole(stop, day, index, isLastStop) {
  if (stop?.overnight) return 'overnight';
  const name = stop?.name ?? '';
  if (name === day?.startLocation) return 'start';
  if (isLastStop && name === day?.endLocation) return 'return';
  return null;
}

function DayMarker({ day, isFirst, isLast }) {
  return (
    <span
      className={`relative z-10 flex h-11 w-11 flex-none items-center justify-center rounded-full bg-accent-700 font-display text-sm font-bold text-white ring-4 ring-accent-100 ${
        isFirst ? '' : ''
      } ${isLast ? '' : ''}`}
      aria-hidden="true"
    >
      {day}
    </span>
  );
}

export default function ItineraryTimeline({ trip, defaultExpandedDays = [1] }) {
  const days = trip?.itinerary ?? [];
  const [expanded, setExpanded] = useState(() => new Set(defaultExpandedDays));

  if (days.length === 0) return null;

  const toggle = (dayNumber) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(dayNumber)) next.delete(dayNumber);
      else next.add(dayNumber);
      return next;
    });
  };

  return (
    <div>
      <ol className="relative">
        {days.map((day, index) => {
          const isOpen = expanded.has(day.day);
          const isLast = index === days.length - 1;
          const panelId = `day-panel-${trip.slug}-${day.day}`;

          return (
            <li key={day.day} className="relative flex gap-4 pb-8 last:pb-0 sm:gap-5">
              {/* The continuous rail. Drawn behind the markers so the journey
                  reads as one unbroken line. */}
              {index < days.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[1.375rem] top-12 h-[calc(100%-3rem)] w-0.5 rounded-full bg-navy-200 sm:left-[1.4375rem]"
                />
              ) : null}

              <DayMarker day={day.day} isFirst={index === 0} isLast={isLast} />

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => toggle(day.day)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="group flex w-full min-h-11 items-start justify-between gap-4 rounded-xl border border-navy-100 bg-white p-4 text-left shadow-card transition-colors duration-200 ease-standard hover:bg-navy-50"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
                      Day {day.day}
                    </span>
                    <span className="mt-1 block font-display text-lg font-bold tracking-tight text-navy-900">
                      {day.startLocation}
                    </span>
                    <span className="mt-1 block text-sm text-navy-600">{day.summary}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-navy-500 transition-transform duration-200 ease-standard group-hover:text-navy-800"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                  >
                    <Icon name="chevronDown" className="h-4 w-4" />
                  </span>
                </button>

                <div id={panelId} hidden={!isOpen} className="mt-3 pl-1">
                  {/* An `<h3>`, not a styled `<p>`: the day title was styled as
                      a heading but exposed as body text, so navigating by
                      heading skipped every day in the flagship section. */}
                  <h3 className="font-display text-base font-bold text-navy-900">
                    {day.title}
                  </h3>

                  <div className="mt-3 space-y-2.5">
                    {(day.stops ?? []).map((stop, stopIndex) => {
                      const role = stopRole(
                        stop,
                        day,
                        stopIndex,
                        stopIndex === (day.stops?.length ?? 0) - 1
                      );
                      return (
                        <div
                          key={stop?.name ?? `stop-${stopIndex}`}
                          className="flex items-start gap-3"
                        >
                          <span
                            aria-hidden="true"
                            className={`mt-2 h-1.5 w-1.5 flex-none rounded-full ${
                              role === 'overnight' ? 'bg-accent-700' : 'bg-navy-300'
                            }`}
                          />
                          <p className="text-sm leading-relaxed text-navy-700">
                            <span className="font-semibold text-navy-900">{stop.name}</span>
                            {role ? (
                              <span className="ml-1.5 text-xs font-bold uppercase tracking-wide text-accent-700">
                                {STOP_ROLE_LABEL[role]}
                              </span>
                            ) : null}
                            {stop.description ? (
                              <span className="block text-navy-600">{stop.description}</span>
                            ) : null}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {day.meals?.length ? (
                    <p className="mt-4 flex items-center gap-2 text-sm text-navy-600">
                      <Icon name="sparkle" className="h-4 w-4 flex-none text-navy-500" />
                      {day.meals.join(' · ')}
                    </p>
                  ) : null}

                  {/* Overnight: where the traveller sleeps. Explicit, because
                      "where do we stay" is a question the day must answer. */}
                  {day.overnight ? (
                    <p className="mt-4 flex items-start gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-700 text-white">
                        <Icon name="home" className="h-4 w-4" />
                      </span>
                      <span className="text-sm">
                        <span className="block text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
                          Overnight
                        </span>
                        <span className="mt-0.5 block font-semibold text-navy-900">
                          {day.endLocation}
                        </span>
                        <span className="block text-navy-700">
                          You sleep here tonight, then continue to {nextLocation(days, day)}.
                        </span>
                      </span>
                    </p>
                  ) : null}

                  {/* Return: where the journey loops back to. */}
                  {!day.overnight && isLast ? (
                    <p className="mt-4 flex items-start gap-3 rounded-xl border border-navy-200 bg-navy-50 p-4">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 border-navy-700 bg-white text-navy-800">
                        <Icon name="route" className="h-4 w-4" />
                      </span>
                      <span className="text-sm">
                        <span className="block text-xs font-bold uppercase tracking-[0.14em] text-navy-700">
                          Return
                        </span>
                        <span className="mt-0.5 block font-semibold text-navy-900">
                          {day.endLocation}
                        </span>
                        <span className="block text-navy-700">
                          The journey ends back where it started.
                        </span>
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The location the traveller wakes up in the next morning. */
function nextLocation(days, day) {
  const next = days.find((candidate) => candidate.day === day.day + 1);
  return next ? next.startLocation : 'the next stop';
}
