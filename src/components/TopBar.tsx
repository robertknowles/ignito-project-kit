import React from 'react'
import { ExternalLink } from 'lucide-react'
import { ClientSelector } from './ClientSelector'
import { SaveButton } from './SaveButton'
import { ResetButton } from './ResetButton'
import { useClientSwitching } from '@/hooks/useClientSwitching'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { TourStep } from '@/components/TourManager'

export const TopBar = () => {
  const { scenarioId } = useScenarioSave()
  const { toast } = useToast()
  const { role } = useAuth()
  const isClient = role === 'client'

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

  return (
    <div id="top-bar" className="sticky top-0 z-40 flex items-center justify-between w-full h-[45px] px-6 bg-white border-b border-gray-200">
      {/* Left side: Scenario Selector (hidden for clients) */}
      <div className="flex items-center">
        {!isClient && (
          <TourStep
            id="client-selector"
            title="Client Selector"
            content="Switch between clients here. Each client has their own saved scenario with unique goals, inputs, and property strategies. Select a client to load their investment plan."
            order={2}
            position="bottom"
          >
            <ClientSelector />
          </TourStep>
        )}
      </div>
      
      {/* Right side: Primary Actions (hidden for clients) */}
      {!isClient && (
        <TourStep
          id="topbar-actions"
          title="Top Bar Actions"
          content="Your main action buttons live here: Save your work, Reset to start fresh, or generate a Client Report PDF to share with your clients."
          order={3}
          position="bottom"
        >
        <div className="flex items-center gap-3">
          <div id="reset-button-wrapper">
            <ResetButton />
          </div>
          <div id="save-button-wrapper">
            <SaveButton />
          </div>
          <button
            id="client-report-button"
            onClick={handleViewClientReport}
            className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-[13px]"
          >
            <ExternalLink size={16} />
            <span>Client Report</span>
          </button>
        </div>
        </TourStep>
      )}
    </div>
  )
}
