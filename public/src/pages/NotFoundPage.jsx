/**
 * 404 — PRD §17 catch-all, §112 (states).
 *
 * A DRAFT or ARCHIVED destination reaches this same state: the public API
 * answers 404 for both an unknown slug and a non-published one, and never
 * discloses which (API.destination.contract.md §2.2). The page therefore says
 * "not found" and nothing more — it must not hint that unpublished content
 * exists.
 *
 * No canonical URL is emitted: a page that does not exist must not assert an
 * identity that could displace a real page in a search index.
 */

import { useSeo } from '../lib/seo';
import { PATHS } from '../constants/routes';
import Button from '../components/common/Button';
import Icon from '../components/common/Icon';

export default function NotFoundPage() {
  useSeo({
    title: 'Page not found',
    description: 'The page you are looking for is not available on SafarUp.',
    canonical: null,
    robots: 'noindex,follow',
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-500 ring-1 ring-navy-100">
        <Icon name="compass" className="h-7 w-7" />
      </span>
      <div className="space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          We could not find that page
        </h1>
        <p className="text-base leading-relaxed text-navy-600">
          The link may be out of date, or the page may have moved. Every destination SafarUp has
          published is listed in one place.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button as="link" to={PATHS.destinations} size="lg">
          Explore destinations
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
        <Button as="link" to={PATHS.home} variant="secondary" size="lg">
          Back to home
        </Button>
      </div>
    </div>
  );
}
