/**
 * Destination card — PRD §22 ("Each card: image, name, short description,
 * region, featured status"), DESIGN_SYSTEM.md §6.
 *
 * One tab stop: the title is the link and a stretched pseudo-element makes the
 * whole card tappable, which is what a thumb expects. The district and
 * category badges inside the card are therefore **text, not links** — nesting
 * interactive elements inside a card link breaks both keyboard navigation and
 * the click target. The district ↔ destination ↔ category internal links live
 * on the destination page and in the list's filter bar, where they are real
 * links (PRD §172).
 *
 * Everything here comes from the list payload as-is: list items carry the same
 * resolved `district` / `categories` / `places` shapes as the detail payload
 * (API.destination.contract.md §2.2), so a card costs zero extra requests.
 */

import { Link } from 'react-router-dom';
import SmartImage from '../common/SmartImage';
import Icon from '../common/Icon';
import { destinationPath } from '../../constants/routes';

function FeaturedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white">
      <Icon name="sparkle" className="h-3.5 w-3.5" />
      Featured
    </span>
  );
}

export default function DestinationCard({ destination }) {
  const { slug, name, shortDescription, heroImage, district, categories, featured } = destination;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-navy-100 shadow-card transition-shadow duration-200 ease-standard hover:shadow-card-hover focus-within:shadow-card-hover">
      <div className="relative">
        {/* Decorative: the name is the link text immediately below. */}
        <SmartImage
          src={heroImage}
          alt=""
          ratio="card"
          sizes="(min-width: 1280px) 22rem, (min-width: 768px) 45vw, 92vw"
        />
        {featured ? (
          <div className="absolute left-3 top-3">
            <FeaturedBadge />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {district ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
            <Icon name="mapPin" className="h-3.5 w-3.5" />
            {district.name}
          </p>
        ) : null}

        <h3 className="text-lg font-bold leading-snug text-navy-900">
          <Link
            to={destinationPath(slug)}
            className="after:absolute after:inset-0 after:content-[''] after:rounded-2xl group-hover:text-brand-700"
          >
            {name}
          </Link>
        </h3>

        <p className="text-sm leading-relaxed text-navy-600">{shortDescription}</p>

        {categories && categories.length > 0 ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-1" aria-label={`Categories for ${name}`}>
            {categories.map((category) => (
              <li
                key={category.id}
                className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-700 ring-1 ring-inset ring-navy-100"
              >
                {category.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
