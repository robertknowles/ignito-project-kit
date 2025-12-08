import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface InvestmentProfile {
  [key: string]: any;
}

interface PropertySelection {
  [key: string]: any;
}

interface ChartData {
  portfolioGrowthData: Array<{
    year: string;
    portfolioValue: number;
    equity: number;
    properties?: string[];
  }>;
  cashflowData: Array<{
    year: string;
    cashflow: number;
    rentalIncome: number;
    loanRepayments: number;
  }>;
  equityGoalYear: number | null;
  incomeGoalYear: number | null;
}

interface ScenarioData {
  id: string;
  client_id: string;
  investmentProfile: InvestmentProfile;
  propertySelections: PropertySelection[];
  timelineSnapshot?: any[];
  chartData?: ChartData;
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

        // Extract investmentProfile, propertySelections, timelineSnapshot, and chartData
        const investmentProfile = parsedData.investmentProfile || {};
        const rawPropertySelections = parsedData.propertySelections || {};
        const propertyInstances = parsedData.propertyInstances || {};
        const timelineSnapshot = parsedData.timelineSnapshot || [];
        const chartData = parsedData.chartData as ChartData | undefined;

        console.log('useSharedScenario: rawPropertySelections type:', Array.isArray(rawPropertySelections) ? 'array' : 'object');
        console.log('useSharedScenario: propertyInstances count:', Object.keys(propertyInstances).length);
        console.log('useSharedScenario: timelineSnapshot count:', timelineSnapshot.length);
        console.log('useSharedScenario: chartData present:', !!chartData);

        // Convert propertySelections from various formats to array format
        // Priority order:
        // 1. timelineSnapshot (contains real property titles from dashboard)
        // 2. rawPropertySelections as array (backward compatibility)
        // 3. rawPropertySelections as object (convert using propertyInstances)
        const propertySelections: PropertySelection[] = [];
        
        // PRIORITY 1: Use timelineSnapshot if available - it has real property titles!
        if (timelineSnapshot && timelineSnapshot.length > 0) {
          console.log('useSharedScenario: Using timelineSnapshot for property data (has real titles)');
          
          // Filter for feasible properties and convert to PropertySelection format
          timelineSnapshot
            .filter((tp: any) => tp.status === 'feasible')
            .forEach((tp: any) => {
              // Calculate rental yield from cashflow data if available
              let yieldValue = '4.0%';
              if (tp.grossRentalIncome && tp.cost) {
                const calculatedYield = (tp.grossRentalIncome / tp.cost) * 100;
                yieldValue = `${calculatedYield.toFixed(1)}%`;
              }
              
              propertySelections.push({
                id: tp.instanceId || tp.id,
                title: tp.title, // Real property title from dashboard!
                cost: tp.cost,
                purchaseYear: Math.floor(tp.affordableYear),
                affordableYear: tp.affordableYear,
                status: tp.status,
                loanAmount: tp.loanAmount,
                depositRequired: tp.depositRequired,
                netCashflow: tp.netCashflow,
                grossRentalIncome: tp.grossRentalIncome,
                yield: yieldValue,
                rentalYield: tp.grossRentalIncome && tp.cost ? (tp.grossRentalIncome / tp.cost) * 100 : 4.0,
                growth: '6', // Default growth rate
                portfolioValueAfter: tp.portfolioValueAfter,
                totalEquityAfter: tp.totalEquityAfter,
              });
            });
        }
        // PRIORITY 2: Check if propertySelections is already an array (backward compatibility)
        else if (Array.isArray(rawPropertySelections)) {
          console.log('useSharedScenario: Using rawPropertySelections array');
          propertySelections.push(...rawPropertySelections);
        } 
        // PRIORITY 3: Convert object format to array (legacy format)
        else {
          console.log('useSharedScenario: Converting rawPropertySelections object to array');
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

        console.log('useSharedScenario: Final propertySelections array with', propertySelections.length, 'properties');
        if (propertySelections.length > 0) {
          console.log('useSharedScenario: First property title:', propertySelections[0].title);
        }

        // Construct the scenario object
        const scenarioData: ScenarioData = {
          id: data.id,
          client_id: data.client_id,
          investmentProfile,
          propertySelections,
          timelineSnapshot,
          chartData,
          created_at: data.created_at,
          updated_at: data.updated_at,
          client_display_name: data.client_display_name || 'Client',
          agent_display_name: data.agent_display_name || 'Agent',
          company_display_name: data.company_display_name || 'PropPath',
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

