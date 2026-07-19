import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  SparklesIcon,
  UserCircleIcon,
  SettingsIcon,
  LogOutIcon,
  ChevronDownIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useBranding } from '@/contexts/BrandingContext'

// Match the main BA dashboard sidebar width so the two shells read as one
// product. Keep this in sync with PortalLayout's content offset.
export const PORTAL_SIDEBAR_WIDTH = 240

/** Two-letter initials for the footer avatar (mirrors AppSidebar). */
const initialsOf = (name?: string | null): string => {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Nav item button - shares the exact styling of the main AppSidebar nav items
// (active #F5F3FF / #7C3AED, inactive #414651 label + #717680 icon, 13px medium).
const NavItemButton: React.FC<{
  icon: React.FC<{ size?: number; className?: string }>
  label: string
  active: boolean
  onClick: () => void
}> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`group/item p-2 relative flex max-h-9 w-full cursor-pointer items-center rounded-md transition duration-100 ease-linear select-none border-none text-left ${
      active ? 'bg-[#F5F3FF] hover:bg-[#F5F3FF]' : 'bg-transparent hover:bg-[#F5F5F5]'
    }`}
  >
    <Icon
      size={18}
      className={`shrink-0 mr-2 transition duration-100 ${
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
  </button>
)

const navItems = [
  { path: '/portal', icon: SparklesIcon, label: 'Property Plan', exact: true },
  { path: '/portal/profile', icon: UserCircleIcon, label: 'Profile' },
]

export const PortalSidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, user } = useAuth()
  const { branding } = useBranding()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setProfileOpen(false)
    try {
      await signOut()
      navigate('/')
    } catch {
      // silent
    }
  }

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Client'

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-50 flex flex-col bg-white border-r border-neutral-200 pt-5"
      style={{ width: PORTAL_SIDEBAR_WIDTH }}
    >
      {/* ── Header: firm logo + name (matches AppSidebar) ── */}
      <div className="mb-3 flex items-center justify-between px-5">
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer bg-transparent border-none p-0"
        >
          <img
            src={branding.logoUrl || '/images/proppath-icon.svg'}
            alt={branding.companyName || 'PropPath'}
            className="h-7 w-auto max-w-[28px] rounded-md object-contain shrink-0"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = '/images/proppath-icon.svg'
            }}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-[16px] font-semibold text-[#181D27] tracking-[-0.01em] truncate leading-tight">
              {branding.companyName || 'PropPath'}
            </span>
            <span className="text-[11px] text-[#717680] leading-tight">Client Portal</span>
          </div>
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex flex-col flex-1 min-h-0 px-4">
        {/* Review countdown banner */}
        <div className="mb-2 px-3 py-2 bg-[#F5F3FF] rounded-md">
          <p className="text-[13px] font-medium text-[#7C3AED] leading-tight">Review coming up</p>
          <p className="text-[11px] text-[#7C3AED]/70 mt-0.5 leading-tight">Details available soon</p>
        </div>

        {navItems.map((item) => (
          <div key={item.path} className="py-px">
            <NavItemButton
              icon={item.icon}
              label={item.label}
              active={isActive(item.path, item.exact)}
              onClick={() => navigate(item.path)}
            />
          </div>
        ))}
      </nav>

      {/* ── Footer: user profile (matches AppSidebar) ── */}
      <div className="mt-auto border-t border-neutral-200 py-3 px-4">
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="group/item flex items-center w-full p-2 rounded-md bg-transparent hover:bg-neutral-50 border-none cursor-pointer text-left transition duration-100 gap-2.5"
          >
            <span className="shrink-0 w-8 h-8 rounded-full bg-neutral-100 text-[#414651] text-[12px] font-semibold flex items-center justify-center">
              {initialsOf(displayName)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#181D27] leading-5 truncate">
                {displayName}
              </div>
              <div className="text-[11px] text-[#717680] leading-4 truncate">
                {user?.email || ''}
              </div>
            </div>
            <ChevronDownIcon
              size={16}
              className={`shrink-0 text-neutral-400 transition duration-150 ${
                profileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {profileOpen && (
            <div className="absolute bottom-full left-0 mb-1 min-w-[180px] bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden z-[60]">
              <button
                onClick={() => { setProfileOpen(false); navigate('/portal/profile') }}
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
  )
}
