/**
 * Plan a Private Trip — the private-trip enquiry conversion flow (PRD §23, §24).
 *
 * This is an **enquiry**, not a booking. There is no payment, no availability
 * check and no confirmation state, because none of those systems exist yet,
 * and a form that implied otherwise would be dishonest. The copy says
 * "enquiry" and "proposal" rather than "book now".
 *
 * Fields are limited to what the private-trip domain actually supports
 * (PRD §56 — destination, dates, traveller count, pickup, hotel/transport
 * preference, budget, special requirements). No invented fields.
 */

import { Children, cloneElement, useId, useState } from 'react';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { SITE_URL } from '../constants/site';
import { PATHS } from '../constants/routes';
import { fetchDestinations } from '../api/destinations.api';
import { fetchDistricts } from '../api/taxonomy.api';
import { SHOWCASE_TRIPS } from '../data/showcase';
import { useQuery } from '@tanstack/react-query';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Icon from '../components/common/Icon';

const STEPS = [
  { id: 'where', label: 'Where', question: 'Where do you want to go?' },
  { id: 'when', label: 'When', question: 'When, and who is travelling?' },
  { id: 'how', label: 'How', question: 'How should the trip feel?' },
  { id: 'done', label: 'Review', question: 'Check it over' },
];

const EMPTY_DRAFT = {
  email: '',
  phone: '',
  district: '',
  destinationInterest: '',
  travelStart: '',
  travelEnd: '',
  travellerCount: '',
  hotelPreference: '',
  transportPreference: '',
  budgetRange: '',
  specialRequirements: '',
  routeInterest: '',
};

export default function PlanTripPage() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [submitted, setSubmitted] = useState(false);

  const districtsQuery = useQuery({
    queryKey: ['districts', 'plan-trip'],
    queryFn: fetchDistricts,
  });
  const destinationsQuery = useQuery({
    // The key must describe what is actually fetched. `planTrip: true` was
    // never a filter — `fetchDestinations` ignores it — so it only made this
    // cache entry look like a narrower query than it is, and guaranteed a
    // second identical request alongside the one `/explore` and `/` already
    // make for the same payload.
    queryKey: ['destinations', { limit: 100 }],
    queryFn: () => fetchDestinations({ limit: 100 }),
  });

  useSeo({
    title: 'Plan a Private Trip',
    description:
      'Tell SafarUp your dates, group and route. We build a private itinerary and send you a proposal you can change before you accept it.',
    canonical: joinUrl(SITE_URL, PATHS.planTrip),
  });

  const update = (field) => (event) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const destinations = destinationsQuery.data?.items ?? [];

  // No backend enquiry endpoint exists yet (privateTripRequests is Phase 3+.
  // PRD §51.1). The form therefore completes to an honest confirmation of what
  // was captured, without claiming a proposal exists or a request was stored.
  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-navy-900">
          Here is the brief you have put together
        </h1>
        <p className="mt-4 text-base leading-relaxed text-navy-600">
          This is the enquiry as you left it. In the live product, submitting it sends the brief to
          the SafarUp operations team, who come back with a proposed itinerary you can change
          before you accept anything.
        </p>

        {/* The `<dl>` stays: Card renders a `<div>`, and `<dt>`/`<dd>` are
            only valid inside a description list. */}
        <Card pad="lg" className="mt-8 text-left">
          <dl>
            {[
              ['Route of interest', draft.routeInterest],
              ['Destination in mind', draft.destinationInterest],
              ['District', draft.district],
              ['Travel dates', draft.travelStart && draft.travelEnd ? `${draft.travelStart} → ${draft.travelEnd}` : '—'],
              ['Travellers', draft.travellerCount],
              ['Budget range', draft.budgetRange],
              ['Contact', [draft.email, draft.phone].filter(Boolean).join(' · ')],
              ['Notes', draft.specialRequirements],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-6 border-b border-navy-50 py-2.5 last:border-0">
                <dt className="text-sm text-navy-500">{label}</dt>
                <dd className="text-right text-sm font-semibold text-navy-900">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <p className="mt-6 text-sm text-navy-500">
          This is a presentation build, so the enquiry is not yet transmitted or stored. On the live
          platform this would be sent to the SafarUp operations team.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => { setSubmitted(false); setDraft(EMPTY_DRAFT); setStep(0); }}>
            Start another enquiry
          </Button>
          <Button as="link" to={PATHS.destinations} variant="secondary">
            Keep exploring
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-navy-950 py-16">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-300">Private trips</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Tell us the trip. We will build it properly.
          </h1>
          <p className="measure mt-5 text-lg leading-relaxed text-white/80">
            Four short steps. No payment, no commitment — you get a proposal you can change before you
            accept anything.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        {/* Step indicator */}
        <ol className="flex flex-wrap gap-2" aria-label="Enquiry steps">
          {STEPS.map((item, index) => {
            const state = index === step ? 'current' : index < step ? 'done' : 'todo';
            return (
              <li key={item.id} className="flex-1 min-w-[5rem]">
                <div
                  className={`rounded-xl border px-3 py-2.5 ${
                    state === 'current'
                      ? 'border-brand-600 bg-brand-50'
                      : state === 'done'
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-navy-100 bg-white'
                  }`}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  <p className="text-[0.65rem] font-bold uppercase tracking-wider text-navy-500">
                    {item.label}
                  </p>
                  <p
                    className={`mt-0.5 text-sm font-semibold ${
                      state === 'current' ? 'text-brand-800' : 'text-navy-700'
                    }`}
                  >
                    {state === 'done' ? 'Done' : index + 1}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <form onSubmit={handleSubmit} className="mt-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-navy-900">
            {STEPS[step].question}
          </h2>

          <div className="mt-6 space-y-5">
            {step === 0 ? (
              <>
                <Field label="A trip you saw" hint="Optional — pick a route if one caught your eye">
                  <select value={draft.routeInterest} onChange={update('routeInterest')} className={inputClass}>
                    <option value="">No particular trip in mind</option>
                    {SHOWCASE_TRIPS.map((trip) => (
                      <option key={trip.slug} value={trip.title}>
                        {trip.title}
                      </option>
                    ))}
                  </select>
                </Field>

                {/*
                  `fetchDistricts()` returns a FLAT array (`taxonomy.api.js`
                  unwraps the envelope's `items`), so the `.items` access this
                  select used to do was always `undefined` and the control
                  rendered with only its "Select a district" option — dead on
                  the primary conversion form. Same shape as the district
                  filter on `/explore`, which works.
                */}
                <Field label="District" hint="Where would you like to travel?">
                  <select value={draft.district} onChange={update('district')} className={inputClass}>
                    <option value="">Select a district</option>
                    {(districtsQuery.data ?? []).map((item) => (
                      <option key={item.id ?? item.slug} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="A destination you already know"
                  hint="Optional — helps us point you the right way"
                >
                  <select value={draft.destinationInterest} onChange={update('destinationInterest')} className={inputClass}>
                    <option value="">No preference yet</option>
                    {destinations.map((destination) => (
                      <option key={destination.id} value={destination.name}>
                        {destination.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Departure date">
                    <input
                      type="date"
                      value={draft.travelStart}
                      onChange={update('travelStart')}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Return date">
                    <input
                      type="date"
                      value={draft.travelEnd}
                      onChange={update('travelEnd')}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="How many travelling?">
                  <input
                    type="number"
                    min="1"
                    placeholder="2"
                    value={draft.travellerCount}
                    onChange={update('travellerCount')}
                    className={inputClass}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email">
                    <input
                      type="email"
                      required
                      value={draft.email}
                      onChange={update('email')}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={draft.phone}
                      onChange={update('phone')}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Field label="Where would you like to stay?">
                  <select value={draft.hotelPreference} onChange={update('hotelPreference')} className={inputClass}>
                    <option value="">No preference</option>
                    <option>Clean and well-reviewed</option>
                    <option>Best available in the area</option>
                    <option>Simple and budget</option>
                    <option>Something with character</option>
                  </select>
                </Field>
                <Field label="How would you like to travel?">
                  <select
                    value={draft.transportPreference}
                    onChange={update('transportPreference')}
                    className={inputClass}
                  >
                    <option value="">No preference</option>
                    <option>Private vehicle for our group</option>
                    <option>Comfortable shared transport</option>
                    <option>Public transport where practical</option>
                  </select>
                </Field>
                <Field label="Rough budget per person">
                  <select value={draft.budgetRange} onChange={update('budgetRange')} className={inputClass}>
                    <option value="">Prefer to discuss</option>
                    <option>Under ₹5,000</option>
                    <option>₹5,000 – ₹10,000</option>
                    <option>₹10,000 – ₹20,000</option>
                    <option>₹20,000+</option>
                  </select>
                </Field>
                <Field label="Anything else we should know?" hint="Food, pace, access needs, must-sees">
                  <textarea
                    rows={4}
                    value={draft.specialRequirements}
                    onChange={update('specialRequirements')}
                    className={inputClass}
                  />
                </Field>
              </>
            ) : null}

            {step === 3 ? (
              <Card pad="lg">
                <p className="text-sm leading-relaxed text-navy-600">
                  Please check this over. We use it to build a first proposal — nothing is charged and
                  nothing is confirmed at this stage.
                </p>
                <dl className="mt-4">
                  {[
                    ['Trip of interest', draft.routeInterest],
                    ['District', draft.district],
                    ['Dates', draft.travelStart && draft.travelEnd ? `${draft.travelStart} → ${draft.travelEnd}` : ''],
                    ['Travellers', draft.travellerCount],
                    ['Stay', draft.hotelPreference],
                    ['Transport', draft.transportPreference],
                    ['Budget', draft.budgetRange],
                    ['Notes', draft.specialRequirements],
                    ['Email', draft.email],
                    ['Phone', draft.phone],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between gap-6 border-b border-navy-50 py-2.5 last:border-0"
                    >
                      <dt className="text-sm text-navy-500">{label}</dt>
                      {/* `text-navy-400` here was ~3.85:1 on white — below the
                          4.5:1 floor for body text. */}
                      <dd className="text-right text-sm font-semibold text-navy-900">
                        {value || <span className="font-normal text-navy-500">Not provided</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
              variant="secondary"
            >
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((current) => current + 1)}>
                Continue
                <Icon name="arrowRight" className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit">
                Submit enquiry
                <Icon name="check" className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </section>
    </>
  );
}

const inputClass =
  // No `focus:outline-none`. index.css draws one focus ring for the whole app
  // via a central `:focus-visible` rule; stripping the outline here deletes
  // the only focus indicator these controls have.
  'mt-1.5 w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 shadow-sm transition-colors placeholder:text-navy-500 focus:border-brand-500';

/**
 * A labelled form field.
 *
 * The hint is rendered OUTSIDE the `<label>` and wired to the control with
 * `aria-describedby`. Nesting it inside — as this did — folds the hint into
 * the control's accessible NAME, so the field announces as
 * "Rough budget per person Prefer to discuss" and the hint stops being a
 * description at all. The control is the single child, so its props are
 * extended here rather than at every call site.
 */
function Field({ label, hint, children }) {
  const hintId = useId();
  const control = Children.only(children);

  return (
    <div>
      <label className="block">
        <span className="text-sm font-semibold text-navy-900">{label}</span>
        {hint ? cloneElement(control, { 'aria-describedby': hintId }) : control}
      </label>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-navy-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
