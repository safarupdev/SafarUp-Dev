/**
 * Modern Floating Pill Sidebar with Real-Time Search & Interactive Profile.
 *
 * Implements:
 * - Searchable navigation: Real-time search across all PRD routes & sub-sections
 * - Keyboard shortcut (⌘ S / Ctrl+S / Ctrl+K) to focus search
 * - Floating pill card container with expandable/collapsible toggle
 * - Branch tree navigation with delicate connector lines
 * - Rich User Profile card with interactive popover (Account info, Role scope, Sign out)
 * - Operations / Team members section with live status indicators
 * - Accurate active route detection for nested paths
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { NAV_SECTIONS } from '../../constants/navigation';
import { roleLabel } from '../../constants/roles';
import Icon from '../common/Icon';
import Logo from '../common/Logo';

const TEAM_MEMBERS = [
  { id: '1', name: 'Esther Howard', role: 'Ops Lead', status: 'online', color: 'bg-emerald-500', avatar: 'EH' },
  { id: '2', name: 'Jacob Jones', role: 'Trip Planner', status: 'busy', color: 'bg-rose-500', avatar: 'JJ' },
  { id: '3', name: 'Cody Fisher', role: 'Support', status: 'online', color: 'bg-emerald-500', avatar: 'CF' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { isCollapsed, setIsCollapsed, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [hoveredFlyout, setHoveredFlyout] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const searchInputRef = useRef(null);

  // Keyboard shortcut: ⌘ S or Ctrl+S or Ctrl+K focuses sidebar search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'k')) {
        e.preventDefault();
        if (isCollapsed) {
          setIsCollapsed(false);
        }
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      } else if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, setIsCollapsed, searchQuery]);

  // Flatten all navigation items into a searchable index
  const allSearchableItems = useMemo(() => {
    const items = [];
    NAV_SECTIONS.forEach((section) => {
      if (section.children) {
        section.children.forEach((child) => {
          items.push({
            label: child.label,
            path: child.path,
            group: section.label,
            icon: section.icon ?? 'compass',
          });
        });
      } else {
        items.push({
          label: section.label,
          path: section.path,
          group: 'Main',
          icon: section.icon ?? 'compass',
        });
      }
    });
    return items;
  }, []);

  // Filter items matching search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return allSearchableItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q)
    );
  }, [searchQuery, allSearchableItems]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isRouteActive = (path, end = false) => {
    if (end) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isDashboardActive =
    location.pathname === '/' ||
    location.pathname.startsWith('/destinations') ||
    location.pathname.startsWith('/districts') ||
    location.pathname.startsWith('/categories') ||
    location.pathname.startsWith('/places');

  return (
    <aside
      className={`relative flex flex-col flex-none transition-all duration-300 ease-standard select-none z-30 ${
        isCollapsed ? 'w-[68px]' : 'w-[236px]'
      }`}
    >
      {/* Outer Floating Pill Card (Extra White, Deep Pill Radius) */}
      <div className="flex h-full flex-col justify-between rounded-[38px] bg-white p-3.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/[0.04]">
        {/* Toggle Expand/Collapse Circular Button on Edge */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-9 z-40 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/[0.06] transition-all hover:scale-110 hover:text-navy-950 focus-visible:outline-none"
        >
          <Icon
            name="chevronRight"
            className={`h-3 w-3 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
          />
        </button>

        {/* Top Header & Search Input */}
        <div className="flex-none">
          {/* Brand Logo centered in the middle */}
          <div className="flex items-center justify-center pt-1.5 pb-3">
            <Logo collapsed={isCollapsed} size={isCollapsed ? 'sm' : 'md'} center={true} />
          </div>

          {/* Real-Time Search Bar */}
          {!isCollapsed ? (
            <div className="relative my-2">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Icon name="search" className="h-3.5 w-3.5" />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search console..."
                className="w-full rounded-xl border border-slate-200/80 bg-slate-50/70 py-2 pl-8 pr-11 text-xs text-slate-800 placeholder:text-slate-400 focus:border-navy-400 focus:bg-white focus:outline-none transition-colors"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-navy-950"
                    title="Clear search"
                  >
                    <Icon name="x" className="h-3 w-3" />
                  </button>
                ) : (
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 shadow-2xs pointer-events-none">
                    ⌘ S
                  </kbd>
                )}
              </div>
            </div>
          ) : (
            <div className="my-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setIsCollapsed(false);
                  setTimeout(() => searchInputRef.current?.focus(), 150);
                }}
                title="Search (⌘ S / Ctrl+S)"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/70 text-slate-500 hover:bg-slate-100 hover:text-navy-950 transition-colors"
              >
                <Icon name="search" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Navigation / Live Search Results */}
        <div className="admin-scrollbar flex-1 overflow-y-auto overflow-x-visible py-2">
          {/* SEARCH RESULTS VIEW */}
          {searchQuery.trim() ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2.5 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Search Results ({searchResults.length})
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] font-semibold text-brand-600 hover:underline"
                >
                  Clear
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  No matching screens found for &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                searchResults.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSearchQuery('')}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors ${
                        isActive
                          ? 'bg-slate-100 text-navy-950 font-bold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-navy-950'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon name={item.icon} className="h-3.5 w-3.5 text-slate-400 flex-none" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-[9px] font-semibold uppercase text-slate-400 ml-2">
                      {item.group}
                    </span>
                  </NavLink>
                ))
              )}
            </div>
          ) : (
            /* DEFAULT NORMAL NAVIGATION */
            <>
              {/* MAIN SECTION */}
              <div className="mb-4">
                {!isCollapsed ? (
                  <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Main
                  </p>
                ) : (
                  <div className="mx-auto mb-2 h-px w-6 bg-slate-200" />
                )}

                {/* Dashboard Accordion Tree */}
                <div
                  className="relative"
                  onMouseEnter={() => isCollapsed && setHoveredFlyout('dashboard')}
                  onMouseLeave={() => isCollapsed && setHoveredFlyout(null)}
                >
                  {!isCollapsed ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => setDashboardOpen((prev) => !prev)}
                        className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold tracking-wide transition-colors ${
                          isDashboardActive
                            ? 'bg-slate-100/90 text-navy-950 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-navy-950'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon
                            name="dashboard"
                            className={`h-4 w-4 ${isDashboardActive ? 'text-navy-950' : 'text-slate-500 group-hover:text-navy-950'}`}
                          />
                          <span>Dashboard</span>
                        </span>
                        <Icon
                          name="chevronDown"
                          className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                            dashboardOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Branch Connector Lines */}
                      {dashboardOpen && (
                        <div className="relative mt-1 ml-4 border-l border-slate-200 pl-3 space-y-1">
                          <NavLink
                            to="/"
                            end
                            className={({ isActive }) =>
                              `group relative flex items-center rounded-xl px-2.5 py-1.5 text-xs transition-all ${
                                isActive
                                  ? 'bg-white text-navy-950 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/[0.04]'
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                              }`
                            }
                          >
                            <span className="absolute -left-3 top-1/2 h-px w-2.5 bg-slate-200 group-hover:bg-slate-400" />
                            <span>Overview</span>
                          </NavLink>

                          <NavLink
                            to="/destinations"
                            className={({ isActive }) =>
                              `group relative flex items-center rounded-xl px-2.5 py-1.5 text-xs transition-all ${
                                isActive || isRouteActive('/destinations')
                                  ? 'bg-white text-navy-950 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/[0.04]'
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                              }`
                            }
                          >
                            <span className="absolute -left-3 top-1/2 h-px w-2.5 bg-slate-200 group-hover:bg-slate-400" />
                            <span>Destinations</span>
                          </NavLink>

                          <NavLink
                            to="/districts"
                            className={({ isActive }) =>
                              `group relative flex items-center rounded-xl px-2.5 py-1.5 text-xs transition-all ${
                                isActive || isRouteActive('/districts')
                                  ? 'bg-white text-navy-950 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/[0.04]'
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                              }`
                            }
                          >
                            <span className="absolute -left-3 top-1/2 h-px w-2.5 bg-slate-200 group-hover:bg-slate-400" />
                            <span>Districts</span>
                          </NavLink>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Collapsed Icon + Floating Flyout Popover */
                    <div className="flex justify-center">
                      <NavLink
                        to="/"
                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                          isDashboardActive
                            ? 'bg-slate-100 text-navy-950 shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-navy-950'
                        }`}
                      >
                        <Icon name="dashboard" className="h-4 w-4" />
                      </NavLink>

                      {hoveredFlyout === 'dashboard' && (
                        <div className="absolute left-full top-0 ml-3 z-50 min-w-[160px] rounded-2xl bg-white p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.1)] ring-1 ring-slate-900/[0.06] animate-fade-rise">
                          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Dashboard
                          </p>
                          <NavLink
                            to="/"
                            end
                            className={({ isActive }) =>
                              `block rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                                isActive ? 'bg-slate-100 font-semibold text-navy-950' : 'text-slate-600 hover:bg-slate-50'
                              }`
                            }
                          >
                            Overview
                          </NavLink>
                          <NavLink
                            to="/destinations"
                            className={({ isActive }) =>
                              `block rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                                isActive || isRouteActive('/destinations')
                                  ? 'bg-slate-100 font-semibold text-navy-950'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`
                            }
                          >
                            Destinations
                          </NavLink>
                          <NavLink
                            to="/districts"
                            className={({ isActive }) =>
                              `block rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                                isActive || isRouteActive('/districts')
                                  ? 'bg-slate-100 font-semibold text-navy-950'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`
                            }
                          >
                            Districts
                          </NavLink>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Additional Sections */}
                <div className="mt-1 space-y-0.5">
                  <NavLink
                    to="/trips/templates"
                    className={({ isActive }) =>
                      `flex items-center rounded-xl px-2.5 py-2 text-xs font-semibold tracking-wide transition-colors ${
                        isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5'
                      } ${
                        isActive || isRouteActive('/trips')
                          ? 'bg-slate-100 text-navy-950 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-navy-950'
                      }`
                    }
                    title="Trips & Routes"
                  >
                    <Icon name="route" className="h-4 w-4 text-slate-500" />
                    {!isCollapsed && <span>Trips</span>}
                  </NavLink>

                  <NavLink
                    to="/bookings"
                    className={({ isActive }) =>
                      `flex items-center rounded-xl px-2.5 py-2 text-xs font-semibold tracking-wide transition-colors ${
                        isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5'
                      } ${
                        isActive || isRouteActive('/bookings')
                          ? 'bg-slate-100 text-navy-950 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-navy-950'
                      }`
                    }
                    title="Bookings"
                  >
                    <Icon name="ticket" className="h-4 w-4 text-slate-500" />
                    {!isCollapsed && <span>Bookings</span>}
                  </NavLink>

                  <NavLink
                    to="/customers"
                    className={({ isActive }) =>
                      `flex items-center rounded-xl px-2.5 py-2 text-xs font-semibold tracking-wide transition-colors ${
                        isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5'
                      } ${
                        isActive || isRouteActive('/customers')
                          ? 'bg-slate-100 text-navy-950 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-navy-950'
                      }`
                    }
                    title="Customers"
                  >
                    <Icon name="users" className="h-4 w-4 text-slate-500" />
                    {!isCollapsed && <span>Customers</span>}
                  </NavLink>

                  <NavLink
                    to="/payments/transactions"
                    className={({ isActive }) =>
                      `flex items-center rounded-xl px-2.5 py-2 text-xs font-semibold tracking-wide transition-colors ${
                        isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5'
                      } ${
                        isActive || isRouteActive('/payments')
                          ? 'bg-slate-100 text-navy-950 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-navy-950'
                      }`
                    }
                    title="Payments & Accounts"
                  >
                    <Icon name="creditCard" className="h-4 w-4 text-slate-500" />
                    {!isCollapsed && <span>Payments</span>}
                  </NavLink>

                  <NavLink
                    to="/communications"
                    className={({ isActive }) =>
                      `flex items-center rounded-xl px-2.5 py-2 text-xs font-semibold tracking-wide transition-colors ${
                        isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5'
                      } ${
                        isActive || isRouteActive('/communications')
                          ? 'bg-slate-100 text-navy-950 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-navy-950'
                      }`
                    }
                    title="Notifications"
                  >
                    <Icon name="bell" className="h-4 w-4 text-slate-500" />
                    {!isCollapsed && <span>Notifications</span>}
                  </NavLink>
                </div>
              </div>

              {/* SECONDARY SECTION: MESSAGES / TEAM */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                {!isCollapsed ? (
                  <div className="flex items-center justify-between px-2.5 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Messages
                    </span>
                    <button
                      type="button"
                      title="New Message"
                      className="text-slate-400 hover:text-navy-950 transition-colors"
                    >
                      <Icon name="plus" className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="mx-auto mb-2 h-px w-6 bg-slate-200" />
                )}

                <div className="space-y-1">
                  {TEAM_MEMBERS.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50 cursor-pointer ${
                        isCollapsed ? 'justify-center' : 'gap-2.5'
                      }`}
                      title={`${member.name} (${member.role} — ${member.status})`}
                    >
                      <div className="relative flex-none">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                          {member.avatar}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-white ${member.color}`}
                        />
                      </div>
                      {!isCollapsed && (
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-800">{member.name}</p>
                          <p className="truncate text-[10px] text-slate-400">{member.role}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Interactive User Profile Card */}
        <div className="relative mt-2 flex-none pt-2 border-t border-slate-100">
          {!isCollapsed ? (
            <div
              onClick={() => setProfileModalOpen((prev) => !prev)}
              className="flex items-center justify-between rounded-2xl bg-slate-50/80 border border-slate-100 p-2 cursor-pointer hover:bg-slate-100/80 transition-colors"
              title="Click to view profile & actions"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="relative flex-none">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-950 text-xs font-bold text-white shadow-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-navy-950">{user?.name ?? 'Super Admin'}</p>
                  <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                    {roleLabel(user?.role)}
                  </p>
                </div>
              </div>

              <div className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400">
                <Icon
                  name="chevronDown"
                  className={`h-3.5 w-3.5 transition-transform ${profileModalOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setProfileModalOpen((prev) => !prev)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-navy-950 text-xs font-bold text-white shadow-xs hover:scale-105 transition-transform"
                title={`${user?.name ?? 'Super Admin'} (Click for profile menu)`}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>
            </div>
          )}

          {/* User Profile Popover Card (Extra White & Crisp Elevation) */}
          {profileModalOpen && (
            <div
              className={`absolute bottom-full mb-2 z-50 rounded-2xl bg-white p-3 shadow-[0_20px_50px_rgba(0,0,0,0.12)] ring-1 ring-slate-900/[0.06] animate-fade-rise ${
                isCollapsed ? 'left-0 min-w-[220px]' : 'left-0 right-0'
              }`}
            >
              {/* Profile Details Header */}
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-navy-950 text-sm font-bold text-white shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-bold text-navy-950">{user?.name ?? 'Super Admin'}</p>
                    <Icon name="check" className="h-3 w-3 text-emerald-600 flex-none" />
                  </div>
                  <p className="truncate text-[10px] text-slate-500">{user?.email ?? 'admin@safarup.in'}</p>
                  <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700">
                    {roleLabel(user?.role)}
                  </span>
                </div>
              </div>

              {/* Organization & Scope Info */}
              <div className="py-2 text-[11px] text-slate-500 border-b border-slate-100">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Org:</span>
                  <span className="font-semibold text-slate-700">SafarUp</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Verified Active
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 space-y-1">
                <NavLink
                  to="/settings"
                  onClick={() => setProfileModalOpen(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Icon name="settings" className="h-3.5 w-3.5 text-slate-400" />
                  <span>Account Settings</span>
                </NavLink>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Icon name="logout" className="h-3.5 w-3.5" />
                  <span>Log out of Console</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
