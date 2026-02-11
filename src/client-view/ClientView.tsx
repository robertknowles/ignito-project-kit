import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { ClientDashboard } from './ClientDashboard';
import { useSharedScenario } from '../hooks/useSharedScenario';
import { compareScenarios } from '../utils/comparisonCalculator';
import { supabase } from '../integrations/supabase/client';
import './client-view.css';

export const ClientView = () => {
  // Fetch scenario data using the share_id from URL
  const { scenario, loading, error } = useSharedScenario();
  
  // State for client email and company ID (for share functionality)
  const [clientEmail, setClientEmail] = useState<string | undefined>();
  const [companyId, setCompanyId] = useState<string | undefined>();

  // Fetch client email and company ID when scenario loads
  useEffect(() => {
    const fetchClientDetails = async () => {
      if (!scenario?.client_id) return;
      
      try {
        // Fetch client email from clients table
        const { data: clientData } = await supabase
          .from('clients')
          .select('email')
          .eq('id', scenario.client_id)
          .single();
        
        if (clientData?.email) {
          setClientEmail(clientData.email);
        }

        // Fetch company_id from scenario
        const { data: scenarioData } = await supabase
          .from('scenarios')
          .select('company_id')
          .eq('id', scenario.id)
          .single();
        
        if (scenarioData?.company_id) {
          setCompanyId(scenarioData.company_id);
        }
      } catch (err) {
        console.error('Error fetching client details:', err);
      }
    };

    fetchClientDetails();
  }, [scenario?.client_id, scenario?.id]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Check if this is a comparison report - must be before any early returns
  const isComparisonMode = scenario?.comparisonMode && scenario?.scenarios && scenario.scenarios.length >= 2;
  
  // Calculate comparison metrics if in comparison mode
  // All hooks must be called before any conditional returns
  const comparisonMetrics = useMemo(() => {
    if (!isComparisonMode || !scenario?.scenarios) return undefined;
    
    const scenarioA = scenario.scenarios[0];
    const scenarioB = scenario.scenarios[1];
    
    // Extract chart data if available (may be stored with scenario)
    const chartDataA = (scenarioA as any).chartData;
    const chartDataB = (scenarioB as any).chartData;
    
    return compareScenarios(scenarioA, scenarioB, scenario.investmentProfile, chartDataA, chartDataB);
  }, [isComparisonMode, scenario?.scenarios, scenario?.investmentProfile]);
  
  // Build scenario data for comparison mode
  const scenarioAData = useMemo(() => {
    if (!isComparisonMode || !scenario?.scenarios) return undefined;
    const s = scenario.scenarios[0];
    return {
      name: s.name,
      investmentProfile: s.investmentProfile,
      propertySelections: s.timeline || [],
      chartData: undefined, // Will be calculated by ClientDashboard if needed
    };
  }, [isComparisonMode, scenario?.scenarios]);
  
  const scenarioBData = useMemo(() => {
    if (!isComparisonMode || !scenario?.scenarios) return undefined;
    const s = scenario.scenarios[1];
    return {
      name: s.name,
      investmentProfile: s.investmentProfile,
      propertySelections: s.timeline || [],
      chartData: undefined, // Will be calculated by ClientDashboard if needed
    };
  }, [isComparisonMode, scenario?.scenarios]);

  // Loading state - after all hooks
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-600 text-lg">Loading your investment dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state - after all hooks
  if (error || !scenario) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="max-w-md p-8 bg-white rounded-xl shadow-lg border border-red-200">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">
            Dashboard Not Found
          </h2>
          <p className="text-gray-700 mb-2">
            {error?.message || 'Unable to load the investment dashboard.'}
          </p>
          <p className="text-sm text-gray-500">
            Please check your link and try again, or contact your advisor for assistance.
          </p>
        </div>
      </div>
    );
  }

  // For comparison mode, we need to render with comparison props
  if (isComparisonMode && comparisonMetrics && scenarioAData && scenarioBData) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col">
        <ClientDashboard 
          investmentProfile={scenario.investmentProfile}
          propertySelections={scenario.propertySelections}
          clientDisplayName={scenario.client_display_name}
          agentDisplayName={scenario.agent_display_name}
          companyDisplayName={scenario.company_display_name}
          onPrint={handlePrint}
          comparisonMode={true}
          scenarioA={scenarioAData}
          scenarioB={scenarioBData}
          comparisonMetrics={comparisonMetrics}
          scenarioId={scenario.id}
          clientId={scenario.client_id}
          clientEmail={clientEmail}
          companyId={companyId}
        />
      </div>
    );
  }

  // Single scenario mode
  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      {/* Dashboard Content */}
      <ClientDashboard 
        investmentProfile={scenario.investmentProfile}
        propertySelections={scenario.propertySelections}
        chartData={scenario.chartData}
        clientDisplayName={scenario.client_display_name}
        agentDisplayName={scenario.agent_display_name}
        companyDisplayName={scenario.company_display_name}
        onPrint={handlePrint}
        scenarioId={scenario.id}
        clientId={scenario.client_id}
        clientEmail={clientEmail}
        companyId={companyId}
      />
    </div>
  );
};

