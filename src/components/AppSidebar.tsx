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
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import { useClient } from '@/contexts/ClientContext';
import { ClientSelector } from './ClientSelector';
import { BetaFeedbackWidget } from './BetaFeedbackWidget';

export const SIDEBAR_WIDTH = 256;

// ── Types ─────────────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  path: string;
  icon: React.FC<{ size?: number; className?: string }>;
  matchPaths?: string[];
  tab?: string;
  badge?: string;
}

interface NavDivider {
  divider: true;
}

type NavEntry = NavItem | NavDivider;

function isDivider(entry: NavEntry): entry is NavDivider {
  return 'divider' in entry && entry.divider === true;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const AppSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, role, user } = useAuth();
  const { branding } = useBranding();
  const { isChatRequestInFlight } = useScenarioSave();
  const { activeClient, setActiveClient } = useClient();
  const [profileOpen, setProfileOpen] = useState(false);
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

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await signOut();
      navigate('/');
    } catch {
      // silent
    }
  };

  const isActive = (item: NavItem) => {
    if (location.pathname === item.path) return true;
    if (item.matchPaths?.includes(location.pathname)) return true;
    return false;
  };

  const isDashboard = location.pathname === '/dashboard';

  const navItems: NavEntry[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboardIcon },
    ...(isClient ? [] : [{ label: 'Compare', path: '/compare', icon: ArrowLeftRightIcon } as NavItem]),
    { label: 'Toolkit', path: '/toolkit', icon: WrenchIcon, badge: 'BETA' },
    ...(isClient ? [] : [{ label: 'Clients', path: '/clients', icon: UsersIcon } as NavItem]),
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  // Filter + clean dividers
  const cleanedItems = navItems.filter((entry, i, arr) => {
    if (!isDivider(entry)) return true;
    if (i === 0 || i === arr.length - 1) return false;
    if (isDivider(arr[i - 1])) return false;
    return true;
  });

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
          <span className="text-[14px] font-bold text-neutral-900 tracking-tight">
            {branding.companyName || 'PropPath'}
          </span>
        </button>
      </div>

      {/* ── Nav list ── */}
      <ul className="flex flex-col px-4 flex-1 list-none m-0">
        {cleanedItems.map((entry, i) => {
          if (isDivider(entry)) {
            return (
              <li key={`divider-${i}`} className="w-full px-0.5 py-2">
                <hr className="h-px w-full border-none bg-neutral-200 m-0" />
              </li>
            );
          }

          const active = isActive(entry);
          const disabled = isChatRequestInFlight && !active;
          const isDashboardItem = entry.path === '/dashboard';

          return (
            <React.Fragment key={entry.path}>
              <li className="py-px">
                {isDashboardItem ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => !disabled && navigate(entry.path)}
                      disabled={disabled}
                      title={disabled ? 'Wait for the plan to finish generating' : undefined}
                      className={`group/item p-2 relative flex flex-1 max-h-9 cursor-pointer items-center rounded-md transition duration-100 ease-linear select-none border-none text-left ${
                        active
                          ? 'bg-neutral-50 hover:bg-neutral-100'
                          : 'bg-transparent hover:bg-neutral-50'
                      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <entry.icon
                        size={20}
                        className={`mr-2 shrink-0 transition duration-100 ${
                          active ? 'text-neutral-500' : 'text-neutral-400 group-hover/item:text-neutral-500'
                        }`}
                      />
                      <span
                        className={`flex-1 text-sm font-semibold truncate transition duration-100 ${
                          active ? 'text-neutral-800' : 'text-neutral-700 group-hover/item:text-neutral-800'
                        }`}
                      >
                        {entry.label}
                      </span>
                    </button>
                    <button
                      onClick={() => { setActiveClient(null); navigate('/dashboard'); }}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors text-neutral-500"
                      title="New client"
                    >
                      <PlusIcon size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => !disabled && navigate(entry.path)}
                    disabled={disabled}
                    title={disabled ? 'Wait for the plan to finish generating' : undefined}
                    className={`group/item p-2 relative flex max-h-9 w-full cursor-pointer items-center rounded-md transition duration-100 ease-linear select-none border-none text-left ${
                      active
                        ? 'bg-neutral-50 hover:bg-neutral-100'
                        : 'bg-transparent hover:bg-neutral-50'
                    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <entry.icon
                      size={20}
                      className={`mr-2 shrink-0 transition duration-100 ${
                        active ? 'text-neutral-500' : 'text-neutral-400 group-hover/item:text-neutral-500'
                      }`}
                    />
                    <span
                      className={`flex-1 text-sm font-semibold truncate transition duration-100 ${
                        active ? 'text-neutral-800' : 'text-neutral-700 group-hover/item:text-neutral-800'
                      }`}
                    >
                      {entry.label}
                    </span>
                    {entry.badge && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-neutral-100 text-neutral-500">
                        {entry.badge}
                      </span>
                    )}
                  </button>
                )}
              </li>

              {/* Client selector under Dashboard */}
              {isDashboardItem && (
                <li className="py-px pl-6">
                  <ClientSelector />
                </li>
              )}
            </React.Fragment>
          );
        })}
        <li className="py-px">
          <BetaFeedbackWidget />
        </li>
      </ul>

      {/* ── Footer: User profile ── matches UUI: mt-auto px-2 py-4 lg:px-4 */}
      <div className="mt-auto border-t border-neutral-200 px-4 py-3">
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="group/item flex items-center gap-2.5 w-full p-2 rounded-md bg-transparent hover:bg-neutral-50 border-none cursor-pointer text-left transition duration-100"
          >
            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-neutral-800 leading-5 truncate">
                {user?.user_metadata?.name || branding.companyName || 'User'}
              </div>
              <div className="text-sm text-neutral-600 leading-5 truncate">
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
    </aside>
  );
};
