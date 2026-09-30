/**
 * Base Button component — High-contrast, keyboard-friendly.
 *
 * Guaranteed visibility across all light/dark surfaces:
 * - primary: solid dark navy/black background with crisp white text
 * - accent: rich SafarUp travel orange background (#c2410c) with white text
 * - secondary: solid white background with dark slate text (#1e293b) & border
 * - ghost: transparent background with dark slate text & soft hover
 * - danger: solid rose red background with white text
 */

import { forwardRef } from 'react';

const VARIANTS = {
  primary:
    'bg-[#0e1726] text-white shadow-sm hover:bg-black active:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400',
  accent:
    'bg-[#c2410c] text-white shadow-sm hover:bg-[#9a3412] active:bg-[#7c2d12] disabled:bg-slate-200 disabled:text-slate-400',
  brand:
    'bg-[#1d4ed8] text-white shadow-sm hover:bg-[#1e40af] active:bg-[#1e3a8a] disabled:bg-slate-200 disabled:text-slate-400',
  secondary:
    'bg-white text-slate-800 border border-slate-300 shadow-2xs hover:bg-slate-50 hover:text-black active:bg-slate-100 disabled:text-slate-400 disabled:bg-slate-50',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 disabled:bg-slate-200 disabled:text-slate-400',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950 active:bg-slate-200 disabled:text-slate-400',
  outline:
    'bg-transparent text-slate-800 border border-slate-300 shadow-2xs hover:bg-slate-50 hover:text-black active:bg-slate-100 disabled:text-slate-400',
};

const SIZES = {
  xs: 'px-2.5 py-1 text-xs font-medium rounded-lg',
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg',
  md: 'px-4 py-2 text-sm font-semibold rounded-xl',
  lg: 'px-5 py-2.5 text-sm font-semibold rounded-xl',
};

const BASE =
  'inline-flex items-center justify-center gap-1.5 transition-all duration-150 ease-standard select-none disabled:cursor-not-allowed disabled:shadow-none';

/** Shared class builder, so a link styled as a button matches a real Button. */
export function buttonClassName(variant = 'primary', className = '', size = 'md') {
  const chosenVariant = VARIANTS[variant] ?? VARIANTS.primary;
  const chosenSize = SIZES[size] ?? SIZES.md;
  return `${BASE} ${chosenVariant} ${chosenSize} ${className}`.trim();
}

/**
 * `forwardRef` so a Button can receive focus programmatically (e.g., Dialog autofocus).
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    type = 'button',
    className = '',
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={buttonClassName(variant, className, size)}
      {...rest}
    >
      {isLoading && (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});

export default Button;
