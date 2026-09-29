/**
 * Icon set — DESIGN_SYSTEM.md §2.2: one iconography, consistent line weight,
 * no mixed icon families in one surface.
 *
 * Every glyph is a 24×24 stroke path at a single weight, inheriting
 * `currentColor`. Stroked rather than filled so an icon can never disagree
 * with the text weight next to it.
 */

const ICONS = {
  home: ['M3.5 10.7 12 3.5l8.5 7.2', 'M5.8 9.4v10.3a.8.8 0 0 0 .8.8h10.8a.8.8 0 0 0 .8-.8V9.4', 'M9.8 20.5v-6h4.4v6'],
  compass: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M15.8 8.2 13.6 13.6 8.2 15.8 10.4 10.4 15.8 8.2Z'],
  mapPin: ['M12 21.5s7-5.9 7-11.5a7 7 0 1 0-14 0c0 5.6 7 11.5 7 11.5Z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
  ticket: [
    'M3.5 9.2V7.7A1.7 1.7 0 0 1 5.2 6h13.6a1.7 1.7 0 0 1 1.7 1.7v1.5a2 2 0 0 0 0 3.6v1.5a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7v-1.5a2 2 0 0 0 0-3.6Z',
    'M13.5 6v2.2M13.5 11v2M13.5 16v2',
  ],
  user: ['M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20.5a7.5 7.5 0 0 1 15 0'],
  arrowRight: ['M4.5 12h14M13.5 6.5 19 12l-5.5 5.5'],
  alert: ['M12 8.5v4.2M12 16.4h.01', 'M10.6 4.4 2.7 17.3a1.9 1.9 0 0 0 1.6 2.9h15.4a1.9 1.9 0 0 0 1.6-2.9L13.4 4.4a1.9 1.9 0 0 0-2.8 0Z'],
  inbox: [
    'M3.5 13.5h4.2l1.4 2.6h6l1.4-2.6h4.2',
    'M3.5 13.5 6 5.6a1.9 1.9 0 0 1 1.8-1.3h8.4a1.9 1.9 0 0 1 1.8 1.3l2.5 7.9v3.9a1.9 1.9 0 0 1-1.9 1.9H5.4a1.9 1.9 0 0 1-1.9-1.9v-3.9Z',
  ],
  sparkle: [
    'M11 3.5 12.6 8.6 17.7 10.2 12.6 11.8 11 16.9 9.4 11.8 4.3 10.2 9.4 8.6 11 3.5Z',
    'M17.5 15.5 18.2 17.8 20.5 18.5 18.2 19.2 17.5 21.5 16.8 19.2 14.5 18.5 16.8 17.8 17.5 15.5Z',
  ],
  landmark: ['M12 3 4 7v2h16V7l-8-4Z', 'M6.5 9.5V19M10.5 9.5V19M13.5 9.5V19M17.5 9.5V19', 'M4 21h16'],
  sun: [
    'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z',
    'M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4',
  ],
  route: ['M6.5 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M17.5 21.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M6.5 6.5V12a4 4 0 0 0 4 4h5'],
  train: [
    'M7 4h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
    'M5 10h14',
    'M8.5 13.6h.01M15.5 13.6h.01',
    'M8 17l-2.5 3.5M16 17l2.5 3.5',
    'M9 7h6v3H9z',
  ],
  plane: ['M21 4 3 11l7 3 3 7 8-17Z', 'M21 4 10 14'],
  globe: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
    'M3.2 12h17.6',
    'M12 3c2.3 2.5 3.4 5.5 3.4 9s-1.1 6.5-3.4 9c-2.3-2.5-3.4-5.5-3.4-9S9.7 5.5 12 3Z',
  ],
  chevronDown: ['m6.5 9.5 5.5 5.5 5.5-5.5'],
};

/**
 * @param {object} props
 * @param {keyof ICONS} props.name
 * @param {string} [props.className]
 * @param {string} [props.title] accessible name. Omit for decorative icons —
 *   an icon whose meaning is already in adjacent text is decorative and must
 *   be hidden from assistive technology (DESIGN_SYSTEM.md §9).
 */
export default function Icon({ name, className = 'h-5 w-5', title }) {
  const paths = ICONS[name];
  if (!paths) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
