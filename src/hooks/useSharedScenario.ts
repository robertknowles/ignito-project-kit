import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface InvestmentProfile {
  [key: string]: any;
}

interface PropertySelection {
  [key: string]: any;
}

interface ScenarioData {
  id: string;
  client_id: string;
  investmentProfile: InvestmentProfile;
  propertySelections: PropertySelection[];
  created_at: string;
  updated_at: string;
  client_display_name: string;
  agent_display_name: string;
  company_display_name: string;
}

interface UseSharedScenarioReturn {
  scenario: ScenarioData | null;
  loading: boolean;
  error: Error | null;
}

export function useSharedScenario(): UseSharedScenarioReturn {
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchScenario() {
      try {
        // Extract share_id from URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share_id');

        // Handle missing share_id
        if (!shareId) {
          throw new Error('No share_id found in URL');
        }

        // Fetch scenario from Supabase
        const { data, error: fetchError } = await supabase
          .from('scenarios')
          .select('id, client_id, data, created_at, updated_at, client_display_name, agent_display_name, company_display_name')
          .eq('share_id', shareId)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch scenario: ${fetchError.message}`);
        }

        if (!data) {
          throw new Error('Scenario not found');
        }

        // Parse the data JSON field
        let parsedData: any = {};
        try {
          parsedData = typeof data.data === 'string' 
            ? JSON.parse(data.data) 
            : data.data;
        } catch (parseError) {
          throw new Error('Failed to parse scenario data');
        }

        // Extract investmentProfile and propertySelections
        const investmentProfile = parsedData.investmentProfile || {};
        const propertySelections = parsedData.propertySelections || [];

        // Construct the scenario object
        const scenarioData: ScenarioData = {
          id: data.id,
          client_id: data.client_id,
          investmentProfile,
          propertySelections,
          created_at: data.created_at,
          updated_at: data.updated_at,
          client_display_name: data.client_display_name || 'Client',
          agent_display_name: data.agent_display_name || 'Agent',
          company_display_name: data.company_display_name || 'Ignito',
        };

        setScenario(scenarioData);
        setError(null);
      } catch (err) {
        console.error('Error fetching shared scenario:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        setScenario(null);
      } finally {
        setLoading(false);
      }
    }

    fetchScenario();
  }, []); // Empty dependency array - only run once on mount

  return { scenario, loading, error };
}

