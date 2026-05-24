import React, { useEffect, useRef } from 'react'
import { Building2 } from 'lucide-react'
import { AppSidebar, SIDEBAR_WIDTH } from '@/components/AppSidebar'
import { ChatPanel } from '../components/ChatPanel'
import { useClient } from '../contexts/ClientContext'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useScenarioSave } from '../contexts/ScenarioSaveContext'
import { BriefTab } from '../components/BriefTab'

export const Portfolio = () => {
  const { clients, activeClient } = useClient()
  const { propertyOrder } = usePropertySelection()
  const { loadClientScenario } = useScenarioSave()

  const recoveryAttemptedRef = useRef(false)
  const recoveryClientIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (recoveryClientIdRef.current !== activeClient?.id) {
      recoveryAttemptedRef.current = false
      recoveryClientIdRef.current = activeClient?.id ?? null
    }
    if (recoveryAttemptedRef.current) return
    if (propertyOrder.length > 0) return
    if (!activeClient?.id) return
    recoveryAttemptedRef.current = true
    loadClientScenario(activeClient.id)
  }, [propertyOrder.length, activeClient?.id, loadClientScenario])

  return (
    <div className="main-app flex h-screen w-full bg-white">
      <AppSidebar />
      <ChatPanel />

      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: SIDEBAR_WIDTH }}
      >

        <div className="flex-1 overflow-auto">
          <div className="flex flex-col mx-auto" style={{ padding: '40px 0 80px 0', width: '80%', maxWidth: 1280, minWidth: 500 }}>
            {!activeClient ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Building2 size={48} className="text-gray-300 mb-4" />
                <h2 className="page-title text-gray-400">Brief</h2>
                <p className="body-secondary mt-1">
                  {clients.length === 0
                    ? 'No clients yet. Add a client to get started.'
                    : 'Select a client to view their brief.'
                  }
                </p>
              </div>
            ) : (
              <BriefTab />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
