import React from 'react';
import { Dashboard } from './components/Dashboard';
import { AppSidebar, SIDEBAR_WIDTH } from './components/AppSidebar';
// InputDrawer hidden for NL pivot - component preserved in codebase for future use
// import { InputDrawer } from './components/InputDrawer';
import { ChatPanel } from './components/ChatPanel';
import { NewClientView } from './components/NewClientView';
import { useClient } from './contexts/ClientContext';
import { useAuth } from './contexts/AuthContext';
import { useScenarioSave } from './contexts/ScenarioSaveContext';
import { useBranding } from './contexts/BrandingContext';
import { PropertyDragDropProvider } from './contexts/PropertyDragDropContext';
import { FileQuestion, Loader2 } from 'lucide-react';

// Comfortable floor for the dashboard pane in the docked-chat split. Below this
// the dashboard stops shrinking and slides off the right edge instead of
// cramping (see the main-content wrapper below).
const DASHBOARD_MIN_WIDTH = 820;

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
        <div id="main-content" className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: `var(--app-sidebar-width, ${SIDEBAR_WIDTH}px)` }}>
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
        <div id="main-content" className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: `var(--app-sidebar-width, ${SIDEBAR_WIDTH}px)` }}>
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
        <div id="main-content" className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: `var(--app-sidebar-width, ${SIDEBAR_WIDTH}px)` }}>
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
              style={{ marginLeft: `var(--app-sidebar-width, ${SIDEBAR_WIDTH}px)` }}
            >
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
              </div>
            </div>
          ) : (
            // Docked "Claude Code" layout: a flex row to the right of the fixed
            // sidebar holds the AI chat column (when open) and the dashboard.
            // ChatPanel is always mounted (keeps chat listeners/effects alive)
            // and self-sizes based on drawerOpen + chatPanelWidth.
            <div
              className="flex-1 flex overflow-hidden min-w-0"
              style={{ marginLeft: `var(--app-sidebar-width, ${SIDEBAR_WIDTH}px)` }}
            >
              <ChatPanel />
              {/* Dashboard keeps a comfortable minimum width. As the chat column
                  grows it shrinks only down to this floor, then slides off the
                  right edge (clipped by the row's overflow-hidden) rather than
                  cramping its cards - matching the Claude Code split behaviour. */}
              <div
                id="main-content"
                className="flex flex-col overflow-hidden"
                style={{ flex: '1 1 auto', minWidth: DASHBOARD_MIN_WIDTH }}
              >
                <div className="flex-1 overflow-hidden">
                  <Dashboard key={activeClient.id} />
                </div>
              </div>
            </div>
          )
        ) : (
          <div
            id="main-content"
            className="flex-1 flex flex-col overflow-hidden"
            style={{ marginLeft: `var(--app-sidebar-width, ${SIDEBAR_WIDTH}px)` }}
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
