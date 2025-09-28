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
import { ClientSelector } from './ClientSelector'
import { SaveIndicator } from './SaveIndicator'
export const Navbar = () => {
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
    await signOut()
    setDropdownOpen(false)
    navigate('/login')
  }
  const handleSettings = () => {
    // Navigate to settings page or open settings modal
    console.log('Opening settings...')
    setDropdownOpen(false)
  }
  return (
    <div className="flex items-center justify-between w-full h-14 px-8 bg-[#f9fafb]">
      <div className="flex items-center gap-3">
        <button
          className={`w-8 h-8 ${location.pathname === '/clients' ? 'bg-[#f3f4f6] text-[#3b82f6] opacity-60' : 'text-[#6b7280] hover:text-[#3b82f6] hover:opacity-60'} rounded-md flex items-center justify-center transition-colors`}
          onClick={() => navigate('/clients')}
        >
          <HomeIcon size={15} />
        </button>
        <button
          className={`w-8 h-8 ${location.pathname === '/dashboard' ? 'bg-[#f3f4f6] text-[#3b82f6] opacity-60' : 'text-[#6b7280] hover:text-[#3b82f6] hover:opacity-60'} rounded-md flex items-center justify-center transition-colors`}
          onClick={() => navigate('/dashboard')}
        >
          <BarChart3Icon size={15} />
        </button>
        <button
          className={`w-8 h-8 ${location.pathname === '/data' ? 'bg-[#f3f4f6] text-[#3b82f6] opacity-60' : 'text-[#6b7280] hover:text-[#3b82f6] hover:opacity-60'} rounded-md flex items-center justify-center transition-colors`}
          onClick={() => navigate('/data')}
        >
          <DatabaseIcon size={15} />
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <ClientSelector />
        </div>
        <SaveIndicator />
      </div>
      <div className="relative" ref={dropdownRef}>
        <button
          className="w-8 h-8 bg-[#3b82f6] bg-opacity-60 text-white rounded-md flex items-center justify-center"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <UserIcon size={15} className="text-white" />
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-[#f3f4f6]">
            <div className="py-1">
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-[#374151] hover:bg-[#f9fafb]"
                onClick={handleSettings}
              >
                <SettingsIcon size={14} className="mr-2" />
                Settings
              </button>
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-[#374151] hover:bg-[#f9fafb]"
                onClick={handleLogout}
              >
                <LogOutIcon size={14} className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}