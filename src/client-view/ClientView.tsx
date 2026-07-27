import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dashboard } from '@/components/Dashboard';
import { DisclaimerBlock } from '@/components/DisclaimerBlock';
import { useScenarioSave } from '@/contexts/ScenarioSaveContext';
import './client-view.css';

interface HeaderMeta {
  clientDisplayName: string;
  agentDisplayName: string;
  companyDisplayName: string;
}

/**
 * Public, no-login client view (/client-view?share_id=…). Hydrates the shared
 * scenario into the app contexts and renders the exact same modern <Dashboard/>
 * the agent (and logged-in portal clients) see, in read-only mode - so the live
 * link the agent pastes into their email shows the real dashboard, not a
 * separate simplified report. No account, no auth: loadScenarioByShareId reads
 * the row by share_id, and viewOnly locks every edit affordance.
 */
export const ClientView = () => {
  const { loadScenarioByShareId } = useScenarioSave();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [meta, setMeta] = useState<HeaderMeta | null>(null);

  // Hydrate once on mount. loadScenarioByShareId isn't referentially stable
  // (its deps include cross-context objects that change as hydration re-renders
  // the tree), so we hold it in a ref and run the load exactly once - depending
  // on it directly would restart the load on every render and never settle.
  const loadRef = useRef(loadScenarioByShareId);
  loadRef.current = loadScenarioByShareId;

  useEffect(() => {
    let cancelled = false;

    const shareId = new URLSearchParams(window.location.search).get('share_id');
    if (!shareId) {
      setStatus('error');
      return;
    }

    loadRef.current(shareId).then((result) => {
      if (cancelled) return;
      if (!result) {
        setStatus('error');
        return;
      }
      setMeta({
        clientDisplayName: result.client_display_name,
        agentDisplayName: result.agent_display_name,
        companyDisplayName: result.company_display_name,
      });
      setStatus('ready');
    });

    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
          <p className="text-gray-600 text-lg">Loading your investment dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="max-w-md p-8 bg-white rounded-xl shadow-lg border border-red-200">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Dashboard Not Found</h2>
          <p className="text-gray-700 mb-2">Unable to load the investment dashboard.</p>
          <p className="text-sm text-gray-500">
            Please check your link and try again, or contact your advisor for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA]">
      {/* Branded header - agent/company attribution for the client */}
      <div className="bg-white border-b border-gray-200 px-6 lg:px-10 py-4 shrink-0">
        <p className="text-xs sm:text-sm text-gray-500 mb-1">Investment Strategy Dashboard</p>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
          {meta?.clientDisplayName}'s Portfolio Plan
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Prepared by {meta?.agentDisplayName} • {meta?.companyDisplayName}
        </p>
      </div>

      {/* The real dashboard, read-only */}
      <div className="flex-1 min-h-0">
        <Dashboard viewOnly />
      </div>

      {/* Compliance disclaimer - pinned to the bottom of the page */}
      <div className="bg-white border-t border-gray-200 px-6 lg:px-10 py-3 shrink-0">
        <DisclaimerBlock variant="B" className="max-w-none" />
      </div>
    </div>
  );
};
