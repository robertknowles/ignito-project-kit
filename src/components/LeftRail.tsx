import React, { useEffect, useState, useRef } from 'react'
import {
  HomeIcon,
  BarChart3Icon,
  DatabaseIcon,
  UserIcon,
  LogOutIcon,
  SettingsIcon,
  Building2Icon,
  HelpCircleIcon,
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Get primary color from branding (defaults handled in BrandingContext)
  const primaryColor = branding.primaryColor

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    try {
      setDropdownOpen(false)
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  const handleSettings = () => {
    console.log('Opening settings...')
    setDropdownOpen(false)
  }

  // Top navigation items
  const topNavItems = [
    { path: '/clients', icon: HomeIcon, label: 'Home', roles: ['owner', 'agent'] },
    { path: '/dashboard', icon: BarChart3Icon, label: 'Dashboard', roles: ['owner', 'agent', 'client'] },
    { path: '/data', icon: DatabaseIcon, label: 'Settings', roles: ['owner', 'agent'] },
  ]

  // Bottom navigation items (above user menu)
  const bottomNavItems = [
    { path: '/company', icon: Building2Icon, label: 'Company', roles: ['owner'] },
  ]

  // Filter nav items based on role
  const filteredTopNavItems = topNavItems.filter(item => 
    role ? item.roles.includes(role) : false
  )
  
  const filteredBottomNavItems = bottomNavItems.filter(item => 
    role ? item.roles.includes(role) : false
  )

  return (
    <TooltipProvider>
      <TourStep
        id="nav-sidebar"
        title="Navigation Sidebar"
        content="Welcome to your investment dashboard! This sidebar is your home base. Navigate between Home (client list), Dashboard (strategy builder), and Settings (data assumptions). Click the Help icon anytime to restart this tour."
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
                onClick={() => navigate('/clients')}
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
          {filteredTopNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <button
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isActive ? 'bg-gray-100' : 'hover:bg-gray-100'
                    }`}
                    style={{ color: primaryColor }}
                    onClick={() => navigate(item.path)}
                  >
                    <Icon size={20} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Spacer to push bottom items down */}
        <div className="flex-1" />

        {/* Bottom Navigation Items (Company, Help, User) */}
        <div className="flex flex-col items-center gap-2">
          {filteredBottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <button
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isActive ? 'bg-gray-100' : 'hover:bg-gray-100'
                    }`}
                    style={{ color: primaryColor }}
                    onClick={() => navigate(item.path)}
                  >
                    <Icon size={20} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}

          {/* Help / Restart Tour Button */}
          <TourStep
            id="tour-complete"
            title="You're All Set! 🎉"
            content="That's the tour! Remember: click the Help icon (?) in the sidebar anytime to restart this tour. Now go build some amazing investment strategies for your clients!"
            order={12}
            position="right"
          >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                style={{ color: primaryColor }}
                onClick={startManualTour}
              >
                <HelpCircleIcon size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Help / Restart Tour</p>
            </TooltipContent>
          </Tooltip>
          </TourStep>

          {/* User Profile Menu */}
          <div className="relative" ref={dropdownRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  dropdownOpen ? 'bg-gray-100' : 'hover:bg-gray-100'
                }`}
                style={{ color: primaryColor }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <UserIcon size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>User Menu</p>
            </TooltipContent>
          </Tooltip>

          {/* Dropdown Menu - positioned to the right of the rail */}
          {dropdownOpen && (
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

