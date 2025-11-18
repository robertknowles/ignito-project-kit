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
        const rawPropertySelections = parsedData.propertySelections || {};
        const propertyInstances = parsedData.propertyInstances || {};

        console.log('useSharedScenario: rawPropertySelections type:', Array.isArray(rawPropertySelections) ? 'array' : 'object');
        console.log('useSharedScenario: propertyInstances count:', Object.keys(propertyInstances).length);

        // Convert propertySelections from object format to array format
        // The saved format is { "property_0": 2, "property_1": 1 } (propertyId => quantity)
        // We need to convert it to an array of property objects for the client view
        const propertySelections: PropertySelection[] = [];
        
        // Check if propertySelections is already an array (for backward compatibility)
        if (Array.isArray(rawPropertySelections)) {
          propertySelections.push(...rawPropertySelections);
        } else {
          // Convert object format to array
          // First, collect all property instances with their IDs
          const allInstances: Array<{instanceKey: string, instanceData: any, propertyId: string, instanceIndex: number}> = [];
          
          Object.entries(rawPropertySelections).forEach(([propertyId, quantity]) => {
            if (typeof quantity === 'number' && quantity > 0) {
              for (let i = 0; i < quantity; i++) {
                const instanceKey = `${propertyId}_instance_${i}`;
                const instanceData = propertyInstances[instanceKey];
                allInstances.push({ instanceKey, instanceData, propertyId, instanceIndex: i });
              }
            }
          });
          
          // Sort instances by purchase year if available (instances are expected to be numbered sequentially)
          // For now, we'll use a simple assignment of years: first property in 2026, then space them out
          const currentYear = new Date().getFullYear();
          const startYear = currentYear + 1; // Start from next year
          
          allInstances.forEach((item, index) => {
            const { instanceKey, instanceData, propertyId, instanceIndex } = item;
            
            if (instanceData) {
              // Use instance data if available
              // Calculate a reasonable purchase year: space properties 1-2 years apart
              const estimatedYear = startYear + Math.floor(index * 1.5);
              
              propertySelections.push({
                id: instanceKey,
                title: propertyId.replace(/_/g, ' ').replace(/property (\d+)/, 'Property Type $1'),
                cost: instanceData.purchasePrice || 500000,
                purchaseYear: estimatedYear,
                affordableYear: estimatedYear,
                status: 'feasible',
                rentalYield: instanceData.rentPerWeek && instanceData.purchasePrice 
                  ? (instanceData.rentPerWeek * 52 / instanceData.purchasePrice * 100) 
                  : 4.0,
                yield: instanceData.rentPerWeek && instanceData.purchasePrice
                  ? `${(instanceData.rentPerWeek * 52 / instanceData.purchasePrice * 100).toFixed(1)}%`
                  : '4.0%',
                growth: instanceData.growthAssumption === 'High' ? '7' : instanceData.growthAssumption === 'Low' ? '4' : '6',
              });
            } else {
              // Fallback to basic data if no instance data available
              const estimatedYear = startYear + Math.floor(index * 1.5);
              propertySelections.push({
                id: instanceKey,
                title: propertyId.replace(/_/g, ' ').replace(/property (\d+)/, 'Property Type $1'),
                cost: 500000, // Default value
                purchaseYear: estimatedYear,
                affordableYear: estimatedYear,
                status: 'feasible',
                yield: '4.0%',
                growth: '6',
              });
            }
          });
        }

        console.log('useSharedScenario: converted propertySelections to array with', propertySelections.length, 'properties');

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

