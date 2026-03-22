import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon, Users, FileText, Building2 } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

type ManageTab = 'clients' | 'forms' | 'company'

const tabs: { id: ManageTab; path: string; label: string; icon: React.ReactNode; roles: string[] }[] = [
  { id: 'clients', path: '/clients', label: 'Clients', icon: <Users size={16} />, roles: ['owner', 'agent'] },
  { id: 'forms', path: '/forms', label: 'Forms', icon: <FileText size={16} />, roles: ['owner', 'agent'] },
  { id: 'company', path: '/company', label: 'Company', icon: <Building2 size={16} />, roles: ['owner'] },
]

interface HomeDrawerProps {
  isOpen: boolean
  onToggle: () => void
}

export const HomeDrawer: React.FC<HomeDrawerProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { role } = useAuth()

  const filteredTabs = tabs.filter(tab => role ? tab.roles.includes(role) : false)

  return (
    <>
      {/* Drawer Container */}
      <div
        className={`fixed left-16 top-0 h-screen bg-white border-r border-gray-200 z-30 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'w-56' : 'w-0'
        }`}
      >
        {/* Content wrapper - only visible when open */}
        <div className={`flex flex-col h-full ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 h-[45px] px-4">
            <h2 className="section-heading">Manage</h2>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-2">
            {filteredTabs.map(tab => {
              const isActive = location.pathname === tab.path
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'text-gray-900 bg-gray-100 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Toggle Button - always visible */}
      <div className={`fixed top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ease-in-out ${
        isOpen ? 'left-[calc(4rem+14rem)]' : 'left-16'
      }`}>
        <button
          onClick={onToggle}
          className="w-5 h-10 bg-white border border-gray-200 rounded-r-md flex items-center justify-center hover:bg-gray-50 shadow-sm"
          aria-label={isOpen ? 'Collapse drawer' : 'Expand drawer'}
        >
          {isOpen ? (
            <ChevronLeftIcon size={14} className="text-gray-500" />
          ) : (
            <ChevronRightIcon size={14} className="text-gray-500" />
          )}
        </button>
      </div>
    </>
  )
}
