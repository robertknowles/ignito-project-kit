import React from 'react';
import { Dashboard } from './components/Dashboard';
import { AppSidebar, SIDEBAR_WIDTH } from './components/AppSidebar';
// InputDrawer hidden for NL pivot — component preserved in codebase for future use
// import { InputDrawer } from './components/InputDrawer';
import { ChatPanel } from './components/ChatPanel';
import { NewClientView } from './components/NewClientView';
import { useClient } from './contexts/ClientContext';
import { useAuth } from './contexts/AuthContext';
import { useScenarioSave } from './contexts/ScenarioSaveContext';
import { useBranding } from './contexts/BrandingContext';
import { PropertyDragDropProvider } from './contexts/PropertyDragDropContext';
import { FileQuestion, Loader2 } from 'lucide-react';

function AppContent() {
  const { activeClient } = useClient();
  const { role } = useAuth();
  const { clientScenarioLoading, noScenarioForClient, isLoadingScenario, loadedScenarioClientId } = useScenarioSave();
  const { branding } = useBranding();
  
  const isClient = role === 'client';
  const showInputDrawer = !isClient || branding.isClientInteractiveEnabled;
  
  // Client empty state - no scenario shared yet
  if (isClient && noScenarioForClient) {
    return (
      <div className="main-app flex h-screen w-full bg-white">
        <AppSidebar />
        <div id="main-content" className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: SIDEBAR_WIDTH }}>
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
      <div className="main-app flex h-screen w-full bg-white">
        <AppSidebar />
        <div id="main-content" className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: SIDEBAR_WIDTH }}>
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

  if (!showInputDrawer) {
    return (
      <div className="main-app flex h-screen w-full bg-white">
        <AppSidebar />
        <div id="main-content" className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: SIDEBAR_WIDTH }}>
          <div className="flex-1 overflow-hidden">
            <Dashboard key="client-scenario" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <PropertyDragDropProvider>
      <div className="main-app flex h-screen w-full bg-white">
        <AppSidebar />

        {activeClient ? (
          (isLoadingScenario || loadedScenarioClientId !== activeClient.id) ? (
            <div
              id="main-content"
              className="flex-1 flex flex-col overflow-hidden"
              style={{ marginLeft: SIDEBAR_WIDTH }}
            >
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
              </div>
            </div>
          ) : (
            <>
              <ChatPanel />
              <div
                id="main-content"
                className="flex-1 flex flex-col overflow-hidden"
                style={{ marginLeft: SIDEBAR_WIDTH }}
              >
                <div className="flex-1 overflow-hidden">
                  <Dashboard key={activeClient.id} />
                </div>
              </div>
            </>
          )
        ) : (
          <div
            id="main-content"
            className="flex-1 flex flex-col overflow-hidden"
            style={{ marginLeft: SIDEBAR_WIDTH }}
          >
            <NewClientView />
          </div>
        )}
      </div>
    </PropertyDragDropProvider>
  );
}

export function App() {
  return <AppContent />;
}
