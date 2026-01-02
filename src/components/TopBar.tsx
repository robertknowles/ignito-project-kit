import React from 'react'
import { ExternalLink } from 'lucide-react'
import { ClientSelector } from './ClientSelector'
import { SaveButton } from './SaveButton'
import { useClientSwitching } from '@/hooks/useClientSwitching'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export const TopBar = () => {
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

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between w-full h-[45px] px-6 bg-white border-b border-gray-200">
      {/* Left side: Scenario Selector */}
      <div className="flex items-center">
        <ClientSelector />
      </div>
      
      {/* Right side: Primary Actions */}
      <div className="flex items-center gap-3">
        <SaveButton />
        <button
          onClick={handleViewClientReport}
          className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-[13px]"
        >
          <ExternalLink size={16} />
          <span>Client Report</span>
        </button>
      </div>
    </div>
  )
}
