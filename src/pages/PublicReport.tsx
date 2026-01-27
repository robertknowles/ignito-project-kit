import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ClientDashboard } from '@/client-view/ClientDashboard';
import { compareScenarios } from '@/utils/comparisonCalculator';
import type { ComparisonMetrics } from '@/utils/comparisonCalculator';
import type { Scenario } from '@/contexts/MultiScenarioContext';

interface ScenarioData {
  id: number;
  client_id: number;
  name: string;
  data: any;
  created_at: string;
  updated_at: string;
  share_id: string | null;
}

// Helper to extract chart data from scenario
const extractChartData = (scenarioData: any) => {
  // Check if chart data is directly available
  if (scenarioData?.chartData) {
    return scenarioData.chartData;
  }
  
  // Otherwise return undefined and let ClientDashboard calculate it
  return undefined;
};

export const PublicReport = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScenario = async () => {
      if (!shareId) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        // Fetch scenario by share_id (public access, no auth needed)
        // Note: This uses the anon key, which should have access via RLS policy
        const { data, error } = await supabase
          .from('scenarios')
          .select('*')
          .eq('share_id', shareId)
          .single();

        if (error) throw error;

        if (!data) {
          setError('Report not found');
          setLoading(false);
          return;
        }

        setScenario(data as ScenarioData);
        
        // Track client view - only set if not already viewed
        const scenarioData = data.data as any;
        if (!scenarioData?.clientViewedAt) {
          // Update the scenario to mark it as viewed
          const updatedData = {
            ...scenarioData,
            clientViewedAt: new Date().toISOString(),
          };
          
          // Fire and forget - don't block the UI
          supabase
            .from('scenarios')
            .update({ data: updatedData })
            .eq('id', data.id)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error('Error tracking view:', updateError);
              } else {
                console.log('Client view tracked successfully');
              }
            });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching scenario:', err);
        setError('Failed to load report');
        setLoading(false);
      }
    };

    fetchScenario();
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Report Not Found</h1>
          <p className="text-gray-600 text-lg">
            {error || 'This report link may be invalid or expired.'}
          </p>
        </div>
      </div>
    );
  }

  // Extract scenario data
  const scenarioData = scenario.data || {};
  
  // Check if this is a comparison report (has multiple scenarios)
  const isComparisonMode = scenarioData.scenarios && scenarioData.scenarios.length >= 2;
  
  // Extract data for rendering
  const investmentProfile = scenarioData.investmentProfile || {};
  const propertySelections = scenarioData.propertySelections || scenarioData.timeline || [];
  const chartData = extractChartData(scenarioData);
  
  // Extract display names
  const clientDisplayName = scenarioData.clientName || 'Client';
  const agentDisplayName = scenarioData.agentName || 'Agent';
  const companyDisplayName = scenarioData.companyName || 'PropPath';

  // If comparison mode, extract scenario A and B data
  if (isComparisonMode) {
    const scenariosArray = scenarioData.scenarios as Scenario[];
    const scenarioAData = scenariosArray[0];
    const scenarioBData = scenariosArray[1];
    
    // Build comparison metrics
    const comparisonMetrics: ComparisonMetrics = compareScenarios(
      scenarioAData,
      scenarioBData,
      investmentProfile
    );
    
    return (
      <ClientDashboard
        investmentProfile={investmentProfile}
        propertySelections={propertySelections}
        clientDisplayName={clientDisplayName}
        agentDisplayName={agentDisplayName}
        companyDisplayName={companyDisplayName}
        comparisonMode={true}
        scenarioA={{
          name: scenarioAData.name || 'Scenario A',
          investmentProfile: scenarioAData.investmentProfile || investmentProfile,
          propertySelections: scenarioAData.timeline || [],
          chartData: extractChartData({ chartData: scenarioAData.chartData }),
        }}
        scenarioB={{
          name: scenarioBData.name || 'Scenario B',
          investmentProfile: scenarioBData.investmentProfile || investmentProfile,
          propertySelections: scenarioBData.timeline || [],
          chartData: extractChartData({ chartData: scenarioBData.chartData }),
        }}
        comparisonMetrics={comparisonMetrics}
      />
    );
  }

  // Single scenario mode
  return (
    <ClientDashboard
      investmentProfile={investmentProfile}
      propertySelections={propertySelections}
      chartData={chartData}
      clientDisplayName={clientDisplayName}
      agentDisplayName={agentDisplayName}
      companyDisplayName={companyDisplayName}
    />
  );
};


