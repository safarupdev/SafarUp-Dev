/**
 * Admin sidebar — PRD §36 (Admin Navigation) and §117 is about tables, but
 * §116 (dense, fast, keyboard-friendly, desktop-first) governs the visual
 * treatment here: a plain, collapsible list rather than heavy graphics.
 */

import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NAV_SECTIONS } from '../../constants/navigation';
import { useAuth } from '../../context/AuthContext';

function isVisible(section, role) {
  return !section.roles || section.roles.includes(role);
}

function NavGroup({ section }) {
  const location = useLocation();

  // A group opens itself when one of its children is the current screen (or
  // an editor is deep inside it), so a section is never hidden behind a
  // collapsed disclosure just because the user navigated straight to it.
  const containsActive = section.children.some(
    (child) =>
      location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)
  );

  const [isOpen, setIsOpen] = useState(containsActive);

  useEffect(() => {
    if (containsActive) setIsOpen(true);
  }, [containsActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        aria-expanded={isOpen}
      >
        {section.label}
        <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-slate-200 pl-3">
          {section.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm ${
                  isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <nav className="flex h-full w-64 flex-none flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-white p-3">
      <div className="mb-2 px-3 py-2">
        <p className="text-lg font-semibold text-slate-900">SafarUp</p>
        <p className="text-xs text-slate-500">Admin Console</p>
      </div>

      {NAV_SECTIONS.filter((section) => isVisible(section, user?.role)).map((section) =>
        section.children ? (
          <NavGroup key={section.label} section={section} />
        ) : (
          <NavLink
            key={section.path}
            to={section.path}
            end={section.path === '/'}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            {section.label}
          </NavLink>
        )
      )}
    </nav>
  );
}
