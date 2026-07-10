/**
 * AppSidebar - UUI "Sections dividers" sidebar navigation
 *
 * Built from the installed UUI source at:
 *   src/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers.tsx
 *   src/components/application/app-navigation/base-components/nav-item.tsx
 *   src/components/application/app-navigation/base-components/nav-list.tsx
 *
 * UUI semantic tokens → Tailwind v3 mapping:
 *   bg-primary        → bg-white
 *   bg-secondary      → bg-neutral-50      (active item)
 *   text-secondary    → text-neutral-700    (inactive label)
 *   text-secondary_hover → text-neutral-800 (active label)
 *   text-fg-quaternary → text-neutral-400   (inactive icon)
 *   text-fg-quaternary_hover → text-neutral-500 (active icon)
 *   bg-border-secondary → bg-neutral-200    (divider)
 *   ring-secondary    → ring-neutral-200    (sidebar border)
 *   MAIN_SIDEBAR_WIDTH = 276px (UUI source default)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboardIcon,
  UsersIcon,
  ArrowLeftRightIcon,
  WrenchIcon,
  SettingsIcon,
  LogOutIcon,
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
  PanelLeftIcon,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { useClient } from '@/contexts/ClientContext';
import { useLayout } from '@/contexts/LayoutContext';
import { SidebarRecents } from './SidebarRecents';
import { ClientSearchModal } from './ClientSearchModal';
import { BetaFeedbackWidget } from './BetaFeedbackWidget';

export const SIDEBAR_WIDTH = 240; // prototype aside width (§ shell)
export const SIDEBAR_COLLAPSED_WIDTH = 56; // icon-only rail width when collapsed (ChatGPT-style)

/** Two-letter initials for the active-client avatar. */
const initialsOf = (name?: string | null): string => {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ── Section label ("CLIENT" / "MANAGE") ───────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={`px-2 pb-1 text-[14px] font-semibold text-[#181D27] ${className ?? ''}`}
  >
    {children}
  </div>
);

// ── Nav item button - shares the exact styling of the original nav list ────────
const NavItemButton: React.FC<{
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  active: boolean;
  disabled?: boolean;
  badge?: string;
  collapsed?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, disabled, badge, collapsed, onClick }) => (
  <button
    onClick={() => !disabled && onClick()}
    disabled={disabled}
    title={collapsed ? label : disabled ? 'Wait for the plan to finish generating' : undefined}
    className={`group/item p-2 relative flex max-h-9 w-full cursor-pointer items-center rounded-md transition duration-100 ease-linear select-none border-none text-left ${
      collapsed ? 'justify-center' : ''
    } ${
      active ? 'bg-[#F5F3FF] hover:bg-[#F5F3FF]' : 'bg-transparent hover:bg-[#F5F5F5]'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    <Icon
      size={18}
      className={`shrink-0 transition duration-100 ${collapsed ? '' : 'mr-2'} ${
        active ? 'text-[#7C3AED]' : 'text-[#717680] group-hover/item:text-[#717680]'
      }`}
    />
    {!collapsed && (
      <span
        className={`flex-1 text-[13px] font-medium truncate transition duration-100 ${
          active ? 'text-[#7C3AED]' : 'text-[#414651] group-hover/item:text-[#181D27]'
        }`}
      >
        {label}
      </span>
    )}
    {!collapsed && badge && (
      <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em] rounded bg-[#F5F3FF] text-[#7C3AED]">
        {badge}
      </span>
    )}
  </button>
);

// ── Component ─────────────────────────────────────────────────────────────────
export const AppSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, role, user } = useAuth();
  const { branding } = useBranding();
  const { isChatRequestInFlight } = useScenarioSave();
  const { activeClient, setActiveClient } = useClient();
  const { setDashboardTab, sidebarCollapsed, toggleSidebar } = useLayout();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isClient = role === 'client';
  const collapsed = sidebarCollapsed;
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  // Publish the live sidebar width so page shells can offset their content
  // via `var(--app-sidebar-width)` and animate the reflow when it collapses.
  useEffect(() => {
    document.documentElement.style.setProperty('--app-sidebar-width', `${width}px`);
  }, [width]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ⌘K / Ctrl+K opens the client search from anywhere the sidebar renders.
  useEffect(() => {
    if (isClient) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isClient]);

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await signOut();
      navigate('/');
    } catch {
      // silent
    }
  };

  const onDashboard = location.pathname === '/dashboard';
  const pathActive = (path: string) => location.pathname === path;

  // While a chat/plan request is in flight, lock navigation away from the
  // active view (preserves the previous nav behaviour).
  const lock = (active: boolean) => isChatRequestInFlight && !active;

  const goDashboard = () => { setDashboardTab('plan'); navigate('/dashboard'); };
  const startNewScenario = () => { setActiveClient(null); setDashboardTab('plan'); navigate('/dashboard'); };

  return (
    <aside
      id="app-sidebar"
      className="fixed left-0 top-0 h-screen z-50 flex flex-col bg-white border-r border-neutral-200 pt-5 transition-[width] duration-200 ease-in-out"
      style={{ width }}
    >
      {/* ── Header: Logo + collapse toggle ── */}
      <div
        className={`mb-3 flex items-center ${
          collapsed ? 'justify-center px-2' : 'justify-between px-5'
        }`}
      >
        {collapsed ? (
          /* Collapsed rail shows the logo by default; hovering swaps it for the
             expand toggle so a single spot both brands and re-opens the rail. */
          <button
            onClick={toggleSidebar}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="group/toggle relative w-8 h-8 flex items-center justify-center rounded-md bg-transparent border-none cursor-pointer hover:bg-[#F5F5F5] transition duration-100"
          >
            <img
              src={branding.logoUrl || '/images/proppath-icon.png'}
              alt={branding.companyName || 'PropPath'}
              className="h-7 w-7 rounded-md object-contain transition-opacity duration-100 group-hover/toggle:opacity-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/proppath-icon.png';
              }}
            />
            <PanelLeftIcon
              size={18}
              className="absolute text-[#414651] opacity-0 transition-opacity duration-100 group-hover/toggle:opacity-100"
            />
          </button>
        ) : (
          <>
            <button
              onClick={() => { setActiveClient(null); navigate('/dashboard'); }}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer bg-transparent border-none p-0"
            >
              <img
                src={branding.logoUrl || '/images/proppath-icon.png'}
                alt={branding.companyName || 'PropPath'}
                className="h-7 w-auto max-w-[28px] rounded-md object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/proppath-icon.png';
                }}
              />
              <span className="text-[16px] font-semibold text-[#181D27] tracking-[-0.01em] truncate">
                {branding.companyName || 'PropPath'}
              </span>
            </button>
            <button
              onClick={toggleSidebar}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-transparent border-none cursor-pointer text-[#717680] hover:bg-[#F5F5F5] hover:text-[#414651] transition duration-100"
            >
              <PanelLeftIcon size={18} />
            </button>
          </>
        )}
      </div>


      {/* ── Nav ── */}
      <nav className={`flex flex-col flex-1 min-h-0 ${collapsed ? 'px-2' : 'px-4'}`}>
        {!isClient && (
          <div className="py-px">
            <NavItemButton
              icon={PlusIcon}
              label="New Scenario"
              collapsed={collapsed}
              active={onDashboard && !activeClient}
              disabled={lock(onDashboard && !activeClient)}
              onClick={startNewScenario}
            />
          </div>
        )}
        {!isClient && (
          <div className="py-px">
            <NavItemButton
              icon={SearchIcon}
              label="Search Clients"
              collapsed={collapsed}
              active={false}
              onClick={() => setSearchOpen(true)}
            />
          </div>
        )}

        {/* Client role has no client list - give them a way back to their plan */}
        {isClient && (
          <div className="py-px">
            <NavItemButton
              icon={LayoutDashboardIcon}
              label="Dashboard"
              collapsed={collapsed}
              active={onDashboard}
              disabled={lock(onDashboard)}
              onClick={goDashboard}
            />
          </div>
        )}
        {!isClient && (
          <div className="py-px">
            <NavItemButton
              icon={ArrowLeftRightIcon}
              label="Compare Scenarios"
              collapsed={collapsed}
              active={pathActive('/compare')}
              disabled={lock(pathActive('/compare'))}
              onClick={() => navigate('/compare')}
            />
          </div>
        )}
        {!isClient && (
          <div className="py-px">
            <NavItemButton
              icon={UsersIcon}
              label="Client Management"
              collapsed={collapsed}
              active={pathActive('/clients')}
              disabled={lock(pathActive('/clients'))}
              onClick={() => navigate('/clients')}
            />
          </div>
        )}
        <div className="py-px">
          <NavItemButton
            icon={WrenchIcon}
            label="Toolkit"
            collapsed={collapsed}
            active={pathActive('/toolkit')}
            disabled={lock(pathActive('/toolkit'))}
            onClick={() => navigate('/toolkit')}
          />
        </div>
        {/* ── Recents - every client scenario, most recent first (hidden while
               the rail is collapsed to icons) ── */}
        {!isClient && !collapsed && (
          <>
            <SectionLabel className="mt-5">Recents</SectionLabel>
            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 pb-2">
              <SidebarRecents />
            </div>
          </>
        )}

        {/* Feedback pinned at the bottom of the nav, above the profile footer */}
        {!collapsed && (
          <div className={`py-px pb-2 ${isClient ? 'mt-auto' : 'mt-1'}`}>
            <BetaFeedbackWidget />
          </div>
        )}
      </nav>

      {/* ── Footer: User profile ── matches UUI: mt-auto px-2 py-4 lg:px-4 */}
      <div className={`mt-auto border-t border-neutral-200 py-3 ${collapsed ? 'px-2' : 'px-4'}`}>
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            title={collapsed ? (user?.user_metadata?.name || branding.companyName || 'User') : undefined}
            className={`group/item flex items-center w-full p-2 rounded-md bg-transparent hover:bg-neutral-50 border-none cursor-pointer text-left transition duration-100 ${
              collapsed ? 'justify-center' : 'gap-2.5'
            }`}
          >
            {collapsed ? (
              <span className="shrink-0 w-8 h-8 rounded-full bg-neutral-100 text-[#414651] text-[12px] font-semibold flex items-center justify-center">
                {initialsOf(user?.user_metadata?.name || branding.companyName || 'User')}
              </span>
            ) : (
              <>
                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#181D27] leading-5 truncate">
                    {user?.user_metadata?.name || branding.companyName || 'User'}
                  </div>
                  <div className="text-[11px] text-[#717680] leading-4 truncate">
                    {user?.email || ''}
                  </div>
                </div>

                {/* Chevron */}
                <ChevronDownIcon
                  size={16}
                  className={`shrink-0 text-neutral-400 transition duration-150 ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                />
              </>
            )}
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <div className="absolute bottom-full left-0 mb-1 min-w-[180px] bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden z-[60]">
              <button
                onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                className="flex items-center gap-2 w-full px-3.5 py-2.5 bg-transparent hover:bg-neutral-50 border-none cursor-pointer text-sm text-neutral-700 transition duration-100 text-left"
              >
                <SettingsIcon size={16} className="text-neutral-400" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3.5 py-2.5 bg-transparent hover:bg-neutral-50 border-none cursor-pointer text-sm text-neutral-700 transition duration-100 text-left"
              >
                <LogOutIcon size={16} className="text-neutral-400" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {!isClient && (
        <ClientSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
    </aside>
  );
};
