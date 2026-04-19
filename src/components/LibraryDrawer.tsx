import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon, BookOpen, Users, Briefcase } from 'lucide-react'

interface PortfolioClient {
  id: number
  name: string
  propertyCount: number
  purchasedCount: number
}

interface LibraryDrawerProps {
  isOpen: boolean
  onToggle: () => void
  activeView: 'library' | 'portfolio'
  onViewChange: (view: 'library' | 'portfolio') => void
  clients: PortfolioClient[]
  activeClientId: number | null
  onSelectClient: (clientId: number) => void
}

const AVATAR_BG = '#535862'
const AVATAR_TEXT_COLOR = '#FFFFFF'

const getInitials = (name: string) => {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({
  isOpen,
  onToggle,
  activeView,
  onViewChange,
  clients,
  activeClientId,
  onSelectClient,
}) => {
  return (
    <>
      {/* Drawer Container */}
      <div
        className={`fixed left-16 top-0 h-screen bg-white border-r border-gray-200 z-30 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'w-56' : 'w-0'
        }`}
      >
        {/* Content wrapper */}
        <div className={`flex flex-col h-full ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 h-[45px] px-4">
            <h2 className="section-heading">Library</h2>
          </div>

          {/* View tabs */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => onViewChange('library')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                activeView === 'library'
                  ? 'text-gray-900 bg-gray-100 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <BookOpen size={16} />
              Property Library
            </button>
            <button
              onClick={() => onViewChange('portfolio')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                activeView === 'portfolio'
                  ? 'text-gray-900 bg-gray-100 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Briefcase size={16} />
              Client Portfolio
            </button>
          </div>

          {/* Client list (only visible in portfolio view) */}
          {activeView === 'portfolio' && (
            <div className="flex-1 overflow-y-auto py-1">
              {clients.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="meta">No client scenarios found</p>
                </div>
              ) : (
                clients.map(client => {
                  const isActive = activeClientId === client.id
                  const initials = getInitials(client.name)

                  return (
                    <button
                      key={client.id}
                      onClick={() => onSelectClient(client.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 border border-[#E9EAEB]"
                        style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT_COLOR }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm truncate ${isActive ? 'font-medium' : ''}`}>
                          {client.name}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {client.purchasedCount > 0
                            ? `${client.purchasedCount} of ${client.propertyCount} purchased`
                            : `${client.propertyCount} propert${client.propertyCount !== 1 ? 'ies' : 'y'}`
                          }
                        </div>
                      </div>
                      {client.purchasedCount > 0 && (
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          )}

          {/* Spacer for library view (no client list) */}
          {activeView === 'library' && <div className="flex-1" />}
        </div>
      </div>

      {/* Toggle Button */}
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
