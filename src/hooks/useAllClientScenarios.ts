import { useState, useEffect } from 'react';
import { useClient } from '../contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { translateLegacyEngineId } from '../utils/propertyCells';

export interface TimelinePurchase {
  year: number;
  propertyType: 'Unit' | 'House' | 'Apartment' | 'Other';
  cost: number;
  propertyNumber: number;
  scenarioName?: string;
}

export interface TimelineClient {
  id: string;
  name: string;
  avatar?: string;
  purchases: TimelinePurchase[];
  scenarioName?: string; // Name of the scenario this row represents
  clientId?: number; // Original client ID for reference
}

/**
 * Hook to fetch all client scenarios and extract property timeline data
 * 
 * This hook reads from Supabase to find saved scenario data for each client,
 * then extracts property information to display on the Planning Calendar.
 * 
 * Data sources:
 * - Supabase `scenarios` table - Contains propertySelections and investmentProfile per scenario
 * - User profile - Contains global propertyAssumptions
 */
export const useAllClientScenarios = () => {
  const { clients } = useClient();
  const { propertyAssumptions, propertyTypeTemplates, getPropertyData } = useDataAssumptions();
  const [timelineData, setTimelineData] = useState<TimelineClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllScenarios = async () => {
      if (clients.length === 0) {
        setTimelineData([]);
        setLoading(false);
        return;
      }

      // Wait for property assumptions to load
      if (!propertyAssumptions || propertyAssumptions.length === 0) {
setLoading(false);
        return;
      }
const allClientTimelines: TimelineClient[] = [];

      for (const client of clients) {
        try {
// Fetch ALL scenarios for this client from Supabase
          const { data: scenarios, error } = await supabase
            .from('scenarios')
            .select('*')
            .eq('client_id', client.id)
            .order('updated_at', { ascending: false });

          if (error) {
continue;
          }

          if (!scenarios || scenarios.length === 0) {
// Add an empty row for this client
            allClientTimelines.push({
              id: `${client.id}-empty`,
              name: client.name,
              avatar: `https://i.pravatar.cc/150?img=${client.id}`,
              purchases: [],
              scenarioName: 'No Scenario',
              clientId: client.id,
            });
            continue;
          }

          // Create a separate timeline row for EACH scenario
          for (let scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {
            const scenario = scenarios[scenarioIndex];
            const scenarioData = scenario.data as any;
            const selections = scenarioData?.propertySelections || {};
            const profile = scenarioData?.investmentProfile || {};
// Extract purchases from this scenario
            const scenarioPurchases: TimelinePurchase[] = [];
            
            // Check if we have a saved timeline snapshot (the "truth" from the dashboard)
            const timelineSnapshot = scenarioData?.timelineSnapshot;
            
            if (timelineSnapshot && Array.isArray(timelineSnapshot) && timelineSnapshot.length > 0) {
              // USE SAVED SNAPSHOT - This is the accurate timeline from the dashboard
let propertyNumber = 1;
              timelineSnapshot
                .filter((item: any) => item.status === 'feasible' && item.affordableYear !== Infinity)
                .forEach((item: any) => {
                  // Extract property type from title
                  let propertyType: TimelinePurchase['propertyType'] = 'Other';
                  const title = (item.title || '').toLowerCase();
                  
                  if (title.includes('unit') || title.includes('apartment')) {
                    propertyType = 'Unit';
                  } else if (title.includes('house') || title.includes('villa') || title.includes('townhouse')) {
                    propertyType = 'House';
                  } else if (title.includes('duplex') || title.includes('block')) {
                    propertyType = 'Apartment';
                  }
                  
                  // Use affordableYear from the snapshot (this is the accurate year)
                  const year = Math.round(item.affordableYear);
                  const cost = item.cost || 0;
scenarioPurchases.push({
                    year,
                    propertyType,
                    cost,
                    propertyNumber: propertyNumber++,
                    scenarioName: scenario.name || 'Scenario',
                  });
                });
            } else {
              // FALLBACK CALCULATION - For legacy data without snapshot
let propertyNumber = 1;

              Object.entries(selections).forEach(([propertyId, quantity]) => {
                const qty = quantity as number;
                if (qty === 0) {
                  return;
                }

                // Resolve propertyId → template, supporting both legacy positional
                // IDs ("property_5") and v4 cell IDs ("metro-house-growth").
                let template = propertyTypeTemplates.find((t) => t.cellId === propertyId);
                if (!template) {
                  const translatedCellId = translateLegacyEngineId(propertyId);
                  if (translatedCellId) {
                    template = propertyTypeTemplates.find((t) => t.cellId === translatedCellId);
                  }
                }
                // Final fallback: legacy positional index lookup (pre-v4 behaviour).
                if (!template) {
                  const match = propertyId.match(/property_(\d+)/);
                  const propertyIndex = match ? parseInt(match[1], 10) : -1;
                  template = propertyIndex >= 0 ? propertyTypeTemplates[propertyIndex] : undefined;
                }

                const assumption = template ? getPropertyData(template.propertyType) : undefined;
                
                if (!assumption) {
                  return;
                }
                
                if (assumption && qty > 0) {
                  // Extract property type from the assumption type
                  let propertyType: TimelinePurchase['propertyType'] = 'Other';
                  const typeStr = assumption.type.toLowerCase();
                  
                  if (typeStr.includes('unit') || typeStr.includes('apartment')) {
                    propertyType = 'Unit';
                  } else if (typeStr.includes('house') || typeStr.includes('villa') || typeStr.includes('townhouse')) {
                    propertyType = 'House';
                  } else if (typeStr.includes('duplex') || typeStr.includes('block')) {
                    propertyType = 'Apartment';
                  }
                  
                  const cost = parseFloat(assumption.averageCost) || 0;
                  const deposit = parseFloat(assumption.deposit) || 20;
                  const depositAmount = cost * (deposit / 100);
                  
                  // Year calculation: account for starting cash (depositPool) and annual savings
                  const baseYear = 2025;
                  const annualSavings = profile.annualSavings || 50000;
                  const depositPool = profile.depositPool || 0;
                  
                  // Calculate total deposit needed for this property number
                  const totalDepositNeeded = depositAmount * propertyNumber;
                  
                  // Calculate shortfall after using available deposit pool
                  const shortfall = totalDepositNeeded - depositPool;
                  
                  // Calculate years needed based on shortfall
                  let yearsNeeded: number;
                  if (shortfall <= 0) {
                    // Can buy immediately - but set to 1 year for realism (takes time to buy)
                    yearsNeeded = 1;
                  } else {
                    yearsNeeded = Math.ceil(shortfall / annualSavings);
                    // Minimum of 1 year for realism
                    yearsNeeded = Math.max(1, yearsNeeded);
                  }
                  
                  const estimatedYear = baseYear + yearsNeeded;
                  
                  // Add one purchase for each quantity
                  for (let i = 0; i < qty; i++) {
                    scenarioPurchases.push({
                      year: estimatedYear + (i * 2), // Space them 2 years apart
                      propertyType: propertyType,
                      cost: cost,
                      propertyNumber: propertyNumber++,
                      scenarioName: scenario.name || 'Scenario',
                    });
                  }
                }
              });
            }
// Create a separate row for this scenario
            // Use a compound ID to ensure uniqueness
            const displayName = scenarios.length > 1 
              ? `${client.name} - ${scenario.name || `Scenario ${scenarioIndex + 1}`}`
              : client.name;

            allClientTimelines.push({
              id: `${client.id}-${scenario.id}`,
              name: displayName,
              avatar: `https://i.pravatar.cc/150?img=${client.id}`,
              purchases: scenarioPurchases.sort((a, b) => a.year - b.year),
              scenarioName: scenario.name || `Scenario ${scenarioIndex + 1}`,
              clientId: client.id,
            });
          }
        } catch (error) {
}
      }
setTimelineData(allClientTimelines);
      setLoading(false);
    };

    fetchAllScenarios();
  }, [clients, propertyAssumptions, propertyTypeTemplates, getPropertyData]);

  return { timelineData, loading };
};

