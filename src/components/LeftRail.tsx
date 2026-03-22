import React, { useEffect, useState, useRef } from 'react'
import {
  HomeIcon,
  UsersIcon,
  BarChart3Icon,
  UserIcon,
  LogOutIcon,
  SettingsIcon,
  BellIcon,
  LineChartIcon,
  BriefcaseIcon,
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

// PropPath default logo SVG component
const PropPathLogo = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 28L4 14L16 2L28 14L14 14L10 18L22 18L26 22L20 28H4Z" fill={color} />
  </svg>
)

export const LeftRail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, role } = useAuth()
  const { branding } = useBranding()
  const { startManualTour } = useTourManager()
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [simulateDropdownOpen, setSimulateDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const simulateDropdownRef = useRef<HTMLDivElement>(null)

  // Get primary color from branding (defaults handled in BrandingContext)
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
      if (
        simulateDropdownRef.current &&
        !simulateDropdownRef.current.contains(event.target as Node)
      ) {
        setSimulateDropdownOpen(false)
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
        {/* Logo at top */}
        <div className="mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                onClick={() => navigate('/home')}
              >
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt="Company logo"
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <PropPathLogo color={primaryColor} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{branding.companyName || 'Home'}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Top Navigation Items */}
        <div className="flex flex-col items-center gap-2">
          {/* Home */}
          {(role === 'owner' || role === 'agent') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    location.pathname === '/home' ? 'bg-gray-100' : 'hover:bg-gray-100'
                  }`}
                  style={{ color: primaryColor }}
                  onClick={() => navigate('/home')}
                >
                  <HomeIcon size={20} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Home</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Simulate — with popover */}
          <div className="relative" ref={simulateDropdownRef}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    isSimulateActive || simulateDropdownOpen ? 'bg-gray-100' : 'hover:bg-gray-100'
                  }`}
                  style={{ color: primaryColor }}
                  onClick={() => setSimulateDropdownOpen(!simulateDropdownOpen)}
                >
                  <BarChart3Icon size={20} />
                </button>
              </TooltipTrigger>
              {!simulateDropdownOpen && (
                <TooltipContent side="right">
                  <p>Simulate</p>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Simulate dropdown */}
            {simulateDropdownOpen && (
              <div className="absolute left-full top-0 ml-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <button
                  className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
                    location.pathname === '/dashboard'
                      ? 'text-gray-900 bg-gray-50 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSimulateDropdownOpen(false)
                    navigate('/dashboard')
                  }}
                >
                  <LineChartIcon size={16} className="mr-3 text-gray-400" />
                  Dashboard
                </button>
                <button
                  className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
                    location.pathname === '/portfolio'
                      ? 'text-gray-900 bg-gray-50 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSimulateDropdownOpen(false)
                    navigate('/portfolio')
                  }}
                >
                  <BriefcaseIcon size={16} className="mr-3 text-gray-400" />
                  Portfolio
                </button>
              </div>
            )}
          </div>

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
          {/* Notifications */}
          {(role === 'owner' || role === 'agent') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                  style={{ color: primaryColor }}
                  onClick={() => {
                    // Placeholder — notifications coming soon
                  }}
                >
                  <BellIcon size={20} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>
          )}

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
