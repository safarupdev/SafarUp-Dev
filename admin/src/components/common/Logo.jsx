/**
 * SafarUp Official Brand Logo & Wordmark.
 *
 * Uses the authentic SafarUp logo artwork:
 * - Map pin emblem with upward winding road motif
 * - Exact dual-tone typography: "Safar" in deep navy (#0d1b3e) and "Up" in travel orange (#f26522)
 * - Clean, minimal layout without distracting subtitles
 */

import { useState } from 'react';

export default function Logo({
  collapsed = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  badge = null,
  center = false,
  className = '',
}) {
  const [imageError, setImageError] = useState(false);

  const imgDimension =
    size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';

  return (
    <div
      className={`flex items-center select-none ${
        center ? 'justify-center' : ''
      } ${collapsed ? 'justify-center' : 'gap-2.5'} ${className}`}
    >
      {/* Official SafarUp Pin Emblem */}
      <div
        className={`relative ${imgDimension} flex-none overflow-hidden rounded-xl bg-white shadow-2xs ring-1 ring-slate-200/80`}
      >
        {!imageError ? (
          <img
            src="/safarup-logo.jpg"
            alt="SafarUp Logo"
            onError={() => setImageError(true)}
            className="h-full w-full object-contain p-0.5"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#0d1b3e] text-xs font-black text-[#f26522]">
            S
          </div>
        )}
      </div>

      {/* Dual-Tone Wordmark */}
      {!collapsed && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold tracking-tight leading-none">
              <span className="text-[#0d1b3e]">Safar</span>
              <span className="text-[#f26522]">Up</span>
            </span>
            {badge && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700">
                {badge}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
