import { useState } from 'react';

/**
 * Image that reserves its space and survives a failed load.
 *
 * DESIGN_SYSTEM.md §10: no layout shift on load, and hero imagery is the
 * largest cost on a Destination page. The aspect ratio is held by the wrapper
 * (not by the image), so the box is the right size before the bytes arrive
 * and stays the right size if they never do.
 *
 * A missing or broken hero image degrades to a branded placeholder rather
 * than a broken-image glyph in the middle of the page.
 */

const TONES = {
  card: 'aspect-[4/3]',
  hero: 'aspect-[16/9] sm:aspect-[21/9]',
  wide: 'aspect-[16/9]',
};

export default function SmartImage({
  src,
  alt,
  ratio = 'card',
  className = '',
  imgClassName = '',
  loading = 'lazy',
  sizes,
  priority = false,
}) {
  const [state, setState] = useState(src ? 'loading' : 'missing');

  return (
    <div className={[TONES[ratio], 'relative overflow-hidden bg-navy-100', className].filter(Boolean).join(' ')}>
      {src && state !== 'missing' ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : loading}
          // The hero is the Largest Contentful Paint element on a destination
          // page; letting it compete with images below the fold costs seconds.
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          sizes={sizes}
          onError={() => setState('missing')}
          className={`h-full w-full object-cover transition-opacity duration-300 ease-standard ${
            state === 'loading' ? 'opacity-0' : 'opacity-100'
          } ${imgClassName}`}
        />
      ) : (
        // Decorative: the destination name is always adjacent as real text, so
        // an empty decorative box needs no alt text (DESIGN_SYSTEM.md §9).
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy-100 to-navy-200" role="presentation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-8 w-8 text-navy-300" aria-hidden="true" focusable="false">
            <path d="M4 18.5 9.4 11l3.6 4.2L16 12l4 6.5H4Z" strokeLinejoin="round" />
            <circle cx="9" cy="7.5" r="1.8" />
          </svg>
        </div>
      )}
    </div>
  );
}
