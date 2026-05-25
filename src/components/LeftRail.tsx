import React, { useEffect, useState, useRef } from 'react'
import {
  UsersIcon,
  BarChart3Icon,
  UserIcon,
  LogOutIcon,
  SettingsIcon,
  BellIcon,
  HomeIcon,
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBranding } from '@/contexts/BrandingContext'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTourManager, TourStep } from '@/components/TourManager'


export const LeftRail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, role } = useAuth()
  const { branding } = useBranding()
  const { startManualTour } = useTourManager()
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  const primaryColor = branding.primaryColor

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    try {
      setProfileDropdownOpen(false)
      await signOut()
      navigate('/')
    } catch (error) {
      // Logout failed
    }
  }

  const handleSettings = () => {
    setProfileDropdownOpen(false)
    navigate('/settings')
  }

  // Check if simulate section is active
  const isSimulateActive = location.pathname === '/dashboard' || location.pathname === '/portfolio'

  return (
    <TooltipProvider>
      <TourStep
        id="nav-sidebar"
        title="Navigation Sidebar"
        content="Welcome to your investment dashboard! This sidebar is your home base. Navigate between Home (overview), Simulate (dashboard & portfolio), and Clients. Click the Help icon anytime to restart this tour."
        order={1}
        position="right"
      >
      <div id="left-rail" className="fixed left-0 top-0 h-screen w-16 bg-white border-r border-gray-200 z-50 flex flex-col items-center py-4">
        {/* Home — explicit home icon (replaces former logo-as-home button) */}
        <div className="mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  location.pathname === '/home' ? 'bg-gray-100' : 'hover:bg-gray-100'
                }`}
                style={{ color: primaryColor }}
                onClick={() => navigate('/home')}
                aria-label="Home"
              >
                <HomeIcon size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Home</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Top Navigation Items */}
        <div className="flex flex-col items-center gap-2">
          {/* Simulate */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isSimulateActive ? 'bg-gray-100' : 'hover:bg-gray-100'
                }`}
                style={{ color: primaryColor }}
                onClick={() => navigate('/dashboard')}
              >
                <BarChart3Icon size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Simulate</p>
            </TooltipContent>
          </Tooltip>

          {/* Clients */}
          {(role === 'owner' || role === 'agent') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    location.pathname === '/clients' ? 'bg-gray-100' : 'hover:bg-gray-100'
                  }`}
                  style={{ color: primaryColor }}
                  onClick={() => navigate('/clients')}
                >
                  <UsersIcon size={20} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Clients</p>
              </TooltipContent>
            </Tooltip>
          )}

        </div>

        {/* Spacer to push bottom items down */}
        <div className="flex-1" />

        {/* Bottom Navigation Items */}
        <div className="flex flex-col items-center gap-2">
          {/* Notifications — hidden until the feature is built. */}

          {/* User Profile Menu */}
          <div className="relative" ref={profileDropdownRef}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    profileDropdownOpen || location.pathname === '/settings' ? 'bg-gray-100' : 'hover:bg-gray-100'
                  }`}
                  style={{ color: primaryColor }}
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                >
                  <UserIcon size={20} />
                </button>
              </TooltipTrigger>
              {!profileDropdownOpen && (
                <TooltipContent side="right">
                  <p>Profile</p>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Profile dropdown */}
            {profileDropdownOpen && (
              <div className="absolute left-full bottom-0 ml-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200">
                <div className="py-1">
                  <button
                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={handleSettings}
                  >
                    <SettingsIcon size={16} className="mr-3 text-gray-400" />
                    Settings
                  </button>
                  <button
                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={handleLogout}
                  >
                    <LogOutIcon size={16} className="mr-3 text-gray-400" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </TourStep>
    </TooltipProvider>
  )
}
