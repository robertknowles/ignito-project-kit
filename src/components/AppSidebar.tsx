/**
 * AppSidebar — UUI "Sections dividers" sidebar navigation
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

// ── Section label ("CLIENT" / "MANAGE") ───────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={`px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#717680] ${className ?? ''}`}
  >
    {children}
  </div>
);

// ── Nav item button — shares the exact styling of the original nav list ────────
const NavItemButton: React.FC<{
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  active: boolean;
  disabled?: boolean;
  badge?: string;
  onClick: () => void;
}> = ({ icon: Icon, label, active, disabled, badge, onClick }) => (
  <button
    onClick={() => !disabled && onClick()}
    disabled={disabled}
    title={disabled ? 'Wait for the plan to finish generating' : undefined}
    className={`group/item p-2 relative flex max-h-9 w-full cursor-pointer items-center rounded-md transition duration-100 ease-linear select-none border-none text-left ${
      active ? 'bg-[#F5F3FF] hover:bg-[#F5F3FF]' : 'bg-transparent hover:bg-[#F5F5F5]'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    <Icon
      size={18}
      className={`mr-2 shrink-0 transition duration-100 ${
        active ? 'text-[#7C3AED]' : 'text-[#717680] group-hover/item:text-[#717680]'
      }`}
    />
    <span
      className={`flex-1 text-[13px] font-medium truncate transition duration-100 ${
        active ? 'text-[#7C3AED]' : 'text-[#414651] group-hover/item:text-[#181D27]'
      }`}
    >
      {label}
    </span>
    {badge && (
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
  const { setDashboardTab } = useLayout();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isClient = role === 'client';

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
      className="fixed left-0 top-0 h-screen z-50 flex flex-col bg-white border-r border-neutral-200 pt-5"
      style={{ width: SIDEBAR_WIDTH }}
    >
      {/* ── Header: Logo ── */}
      <div className="px-5 mb-3">
        <button
          onClick={() => { setActiveClient(null); navigate('/dashboard'); }}
          className="flex items-center gap-2.5 cursor-pointer bg-transparent border-none p-0"
        >
          <img
            src={branding.logoUrl || '/images/proppath-icon.png'}
            alt={branding.companyName || 'PropPath'}
            className="h-7 w-auto max-w-[28px] rounded-md object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/proppath-icon.png';
            }}
          />
          <span className="text-[16px] font-semibold text-[#181D27] tracking-[-0.01em]">
            {branding.companyName || 'PropPath'}
          </span>
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex flex-col flex-1 min-h-0 px-4">
        {!isClient && (
          <div className="py-px">
            <NavItemButton
              icon={PlusIcon}
              label="New Scenario"
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
              active={false}
              onClick={() => setSearchOpen(true)}
            />
          </div>
        )}

        {/* Client role has no client list — give them a way back to their plan */}
        {isClient && (
          <div className="py-px">
            <NavItemButton
              icon={LayoutDashboardIcon}
              label="Dashboard"
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
            badge="BETA"
            active={pathActive('/toolkit')}
            disabled={lock(pathActive('/toolkit'))}
            onClick={() => navigate('/toolkit')}
          />
        </div>
        {/* ── Recents — every client scenario, most recent first ── */}
        {!isClient && (
          <>
            <SectionLabel className="mt-5">Recents</SectionLabel>
            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 pb-2">
              <SidebarRecents />
            </div>
          </>
        )}

        {/* Feedback pinned at the bottom of the nav, above the profile footer */}
        <div className={`py-px pb-2 ${isClient ? 'mt-auto' : 'mt-1'}`}>
          <BetaFeedbackWidget />
        </div>
      </nav>

      {/* ── Footer: User profile ── matches UUI: mt-auto px-2 py-4 lg:px-4 */}
      <div className="mt-auto border-t border-neutral-200 px-4 py-3">
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="group/item flex items-center gap-2.5 w-full p-2 rounded-md bg-transparent hover:bg-neutral-50 border-none cursor-pointer text-left transition duration-100"
          >
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
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden z-[60]">
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
