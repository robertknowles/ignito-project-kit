import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { LeftRail } from './components/LeftRail';
import { TopBar } from './components/TopBar';
import { InputDrawer } from './components/InputDrawer';
import { useClient } from './contexts/ClientContext';
import { useAuth } from './contexts/AuthContext';
import { useScenarioSave } from './contexts/ScenarioSaveContext';
import { useBranding } from './contexts/BrandingContext';
import { PropertyDragDropProvider } from './contexts/PropertyDragDropContext';
import { FileQuestion, Loader2 } from 'lucide-react';

export function App() {
  const { activeClient } = useClient();
  const { role } = useAuth();
  const { clientScenarioLoading, noScenarioForClient } = useScenarioSave();
  const { branding } = useBranding();
  const [drawerOpen, setDrawerOpen] = useState(true);
  
  const isClient = role === 'client';
  const showInputDrawer = !isClient || branding.isClientInteractiveEnabled;
  
  // Client empty state - no scenario shared yet
  if (isClient && noScenarioForClient) {
    return (
      <div className="main-app flex h-screen w-full bg-[#f9fafb]">
        <LeftRail />
        <div id="main-content" className="flex-1 flex flex-col overflow-hidden ml-16">
          <TopBar />
          <div className="flex-1 flex items-center justify-center px-6 py-5">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <FileQuestion className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Plan Available Yet
              </h2>
              <p className="text-gray-500 mb-6">
                Your agent hasn't shared an investment plan with you yet. Once they create and share a scenario, you'll be able to explore it here.
              </p>
              <p className="text-sm text-gray-400">
                Check back soon or contact your agent for updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Client loading state
  if (isClient && clientScenarioLoading) {
    return (
      <div className="main-app flex h-screen w-full bg-[#f9fafb]">
        <LeftRail />
        <div id="main-content" className="flex-1 flex flex-col overflow-hidden ml-16">
          <TopBar />
          <div className="flex-1 flex items-center justify-center px-6 py-5">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Loading your investment scenario...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show InputDrawer based on role and company settings
  // - Staff (owner/agent): always show InputDrawer
  // - Client: show only if is_client_interactive_enabled is true
  if (!showInputDrawer) {
    return (
      <div className="main-app flex h-screen w-full bg-[#f9fafb]">
        <LeftRail />
        <div id="main-content" className="flex-1 flex flex-col overflow-hidden ml-16">
          <TopBar />
          <div className="flex-1 overflow-hidden">
            <Dashboard key="client-scenario" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <PropertyDragDropProvider>
      <div className="main-app flex h-screen w-full bg-[#f9fafb]">
        <LeftRail />
        <InputDrawer isOpen={drawerOpen} onToggle={() => setDrawerOpen(!drawerOpen)} />
        
        {/* Main Content Area - margin adjusts based on drawer state */}
        <div 
          id="main-content"
          className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
            drawerOpen ? 'ml-[352px]' : 'ml-16'
          }`}
        >
          <TopBar />
          <div className="flex-1 overflow-hidden">
            {/* Force Dashboard to remount when client changes by using key prop */}
            <Dashboard key={activeClient?.id || 'no-client'} />
          </div>
        </div>
      </div>
    </PropertyDragDropProvider>
  );
}
