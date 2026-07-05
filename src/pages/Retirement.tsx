import React, { useEffect, useRef } from 'react'
import { Building2 } from 'lucide-react'
import { AppSidebar, SIDEBAR_WIDTH } from '@/components/AppSidebar'
import { ChatPanel } from '../components/ChatPanel'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useClient } from '../contexts/ClientContext'
import { useScenarioSave } from '../contexts/ScenarioSaveContext'
import { PortfolioTab } from '../components/PortfolioTab'

const Retirement: React.FC = () => {
  const { propertyOrder } = usePropertySelection()
  const { clients, activeClient } = useClient()
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
        style={{ marginLeft: `var(--app-sidebar-width, ${SIDEBAR_WIDTH}px)`, transition: 'margin-left 200ms ease-in-out' }}
      >

        <div className="flex-1 overflow-auto bg-white">
          <div className="flex flex-col gap-6 mx-auto" style={{ padding: '40px 0 80px 0', width: '80%', maxWidth: 1280, minWidth: 500 }}>
            {!activeClient ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Building2 size={48} className="text-gray-300 mb-4" />
                <h2 className="page-title text-gray-400">Portfolio</h2>
                <p className="body-secondary mt-1">
                  {clients.length === 0
                    ? 'No clients yet. Add a client to get started.'
                    : 'Select a client to view their portfolio.'
                  }
                </p>
              </div>
            ) : (
              <PortfolioTab />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Retirement
