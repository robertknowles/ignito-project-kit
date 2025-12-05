import React, { useEffect, useState, useRef } from 'react'
import {
  HomeIcon,
  BarChart3Icon,
  DatabaseIcon,
  UserIcon,
  LogOutIcon,
  SettingsIcon,
  ExternalLink,
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ClientSelector } from './ClientSelector'
import { SaveButton } from './SaveButton'
import { useClientSwitching } from '@/hooks/useClientSwitching'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
export const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { scenarioId } = useScenarioSave()
  const { toast } = useToast()
  
  // Initialize client switching logic
  useClientSwitching()
  
  // Generate share link and open in new tab
  const handleViewClientReport = async () => {
    if (!scenarioId) {
      toast({
        title: 'Save Required',
        description: 'Please save the scenario first before viewing the client report.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Check if scenario already has a share_id
      const { data: scenario, error: fetchError } = await supabase
        .from('scenarios')
        .select('share_id')
        .eq('id', scenarioId)
        .single()

      if (fetchError) throw fetchError

      let shareId = scenario?.share_id

      // If no share_id exists, generate one
      if (!shareId) {
        shareId = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15)

        const { error: updateError } = await supabase
          .from('scenarios')
          .update({ share_id: shareId })
          .eq('id', scenarioId)

        if (updateError) throw updateError
      }

      // Open the client report in a new tab with the share_id
      const reportUrl = `${window.location.origin}/client-view?share_id=${shareId}`
      window.open(reportUrl, '_blank')
      
      toast({
        title: 'Opening Report',
        description: 'Client report opened in new tab',
      })
    } catch (error) {
      console.error('Error generating client report link:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate client report link',
        variant: 'destructive',
      })
    }
  }
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
      // Redirect to landing page after logout
      navigate('/')
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }
  const handleSettings = () => {
    // Navigate to settings page or open settings modal
    console.log('Opening settings...')
    setDropdownOpen(false)
  }
  return (
    <TooltipProvider>
      <div className="flex items-center justify-between w-full h-14 px-8 bg-[#f9fafb] relative z-50">
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
        </div>
        
        <div className="flex items-center gap-3">
          <SaveButton />
          <button
            onClick={handleViewClientReport}
            className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <ExternalLink size={16} />
            <span>Client Report</span>
          </button>
          <div className="relative" ref={dropdownRef}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="w-8 h-8 text-[#6b7280] hover:text-[#3b82f6] hover:opacity-60 rounded-md flex items-center justify-center transition-colors"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <UserIcon size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>User Menu</p>
              </TooltipContent>
            </Tooltip>
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
      </div>
    </TooltipProvider>
  )
}