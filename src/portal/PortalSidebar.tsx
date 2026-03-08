import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  SparklesIcon,
  LayoutGridIcon,
  UserCircleIcon,
  LogOutIcon,
  SettingsIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useBranding } from '@/contexts/BrandingContext'

const PropPathLogo = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 28L4 14L16 2L28 14L14 14L10 18L22 18L26 22L20 28H4Z" fill={color} />
  </svg>
)

const navItems = [
  { path: '/portal', icon: HomeIcon, label: 'Home', exact: true },
  { path: '/portal/property-plan', icon: SparklesIcon, label: 'Property Plan' },
  { path: '/portal/portfolio', icon: LayoutGridIcon, label: 'Portfolio' },
  { path: '/portal/profile', icon: UserCircleIcon, label: 'Profile' },
]

export const PortalSidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, user } = useAuth()
  const { branding } = useBranding()

  const primaryColor = branding.primaryColor

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      // Logout failed
    }
  }

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-[200px] bg-white border-r border-gray-200 z-50 flex flex-col">
      {/* Logo + Portal Label */}
      <div className="px-4 pt-5 pb-3">
        <button
          className="flex items-center gap-2.5"
          onClick={() => navigate('/portal')}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Company logo"
                className="w-5 h-5 object-contain"
              />
            ) : (
              <PropPathLogo color={primaryColor} />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 leading-tight">
              {branding.companyName || 'PropPath'}
            </span>
            <span className="text-[11px] text-gray-500 leading-tight">Client Portal</span>
          </div>
        </button>
      </div>

      {/* Review countdown banner */}
      <div className="mx-3 mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-xs font-medium text-blue-700">Review coming up</p>
        <p className="text-[11px] text-blue-600 mt-0.5">Details available soon</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2">
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path, item.exact)
            return (
              <button
                key={item.path}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'text-gray-900 bg-gray-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => navigate(item.path)}
              >
                <Icon
                  size={18}
                  style={{ color: active ? primaryColor : undefined }}
                />
                <span>{item.label}</span>
                {active && (
                  <div
                    className="w-1.5 h-1.5 rounded-full ml-auto"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Settings + Logout at bottom */}
      <div className="px-2 pb-3 border-t border-gray-100 pt-2">
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/portal/profile')}
        >
          <SettingsIcon size={18} />
          <span>Settings</span>
        </button>
      </div>

      {/* User info */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
            style={{ backgroundColor: primaryColor }}
          >
            {user?.email?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Client'}
            </p>
            <p className="text-[11px] text-gray-500 truncate">{user?.email || ''}</p>
          </div>
          <button
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOutIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
