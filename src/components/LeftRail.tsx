import React, { useEffect, useState, useRef } from 'react'
import {
  HomeIcon,
  BarChart3Icon,
  DatabaseIcon,
  UserIcon,
  LogOutIcon,
  SettingsIcon,
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const LeftRail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()
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

  const navItems = [
    { path: '/clients', icon: HomeIcon, label: 'Home' },
    { path: '/dashboard', icon: BarChart3Icon, label: 'Dashboard' },
    { path: '/data', icon: DatabaseIcon, label: 'Settings' },
  ]

  return (
    <TooltipProvider>
      <div className="fixed left-0 top-0 h-screen w-16 bg-white border-r border-gray-200 z-50 flex flex-col items-center py-4">
        {/* Top Navigation Items */}
        <div className="flex flex-col items-center gap-2">
          {navItems.map((item) => {
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

        {/* Spacer to push user menu to bottom */}
        <div className="flex-1" />

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

