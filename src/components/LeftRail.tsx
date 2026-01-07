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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTourManager } from '@/components/TourManager'

export const LeftRail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, role } = useAuth()
  const { startManualTour } = useTourManager()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
      <div id="left-rail" className="fixed left-0 top-0 h-screen w-16 bg-white border-r border-gray-200 z-50 flex flex-col items-center py-4">
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
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
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

        {/* Bottom Navigation Items (above user menu) */}
        <div className="flex flex-col items-center gap-2 mb-2">
          {filteredBottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <button
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
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

        {/* Help / Restart Tour Button */}
        <div className="mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                onClick={startManualTour}
              >
                <HelpCircleIcon size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Help / Restart Tour</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* User Profile Menu at Bottom */}
        <div className="relative" ref={dropdownRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  dropdownOpen
                    ? 'bg-gray-100 text-gray-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
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
    </TooltipProvider>
  )
}

