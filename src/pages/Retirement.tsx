import React from 'react'
import { LeftRail } from '../components/LeftRail'
import { TopBar } from '../components/TopBar'
import { ChatPanel } from '../components/ChatPanel'
import { useLayout } from '../contexts/LayoutContext'
import { RetirementScenarioPanel } from '../components/RetirementScenario/RetirementScenarioPanel'
import { ChartCard } from '../components/ui/ChartCard'

const Retirement: React.FC = () => {
  const { chatPanelWidth } = useLayout()
  const drawerOpen = true

  return (
    <div className="main-app flex h-screen w-full bg-[#FAFAFA]">
      <LeftRail />
      <ChatPanel isOpen={drawerOpen} />

      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
        style={{ marginLeft: drawerOpen ? 64 + chatPanelWidth : 64 }}
      >
        <TopBar />

        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-6 mx-auto" style={{ padding: '40px 0 80px 0', width: '80%', maxWidth: 1280, minWidth: 500 }}>
            <ChartCard title="Retirement Scenario">
              <RetirementScenarioPanel />
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Retirement
