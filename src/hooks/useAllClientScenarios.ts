import { useState, useEffect } from 'react';
import { useClient } from '../contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';

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
  const { propertyAssumptions } = useDataAssumptions();
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
        console.log('useAllClientScenarios: Waiting for property assumptions to load...');
        setLoading(false);
        return;
      }

      console.log(`useAllClientScenarios: Starting with ${clients.length} clients and ${propertyAssumptions.length} property types`);

      const allClientTimelines: TimelineClient[] = [];

      for (const client of clients) {
        try {
          console.log(`Loading scenarios for client ${client.id}: ${client.name}`);
          
          // Fetch ALL scenarios for this client from Supabase
          const { data: scenarios, error } = await supabase
            .from('scenarios')
            .select('*')
            .eq('client_id', client.id)
            .order('updated_at', { ascending: false });

          if (error) {
            console.error(`Error fetching scenarios for client ${client.id}:`, error);
            continue;
          }

          if (!scenarios || scenarios.length === 0) {
            console.log(`No scenarios found for ${client.name}`);
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

          console.log(`Found ${scenarios.length} scenario(s) for ${client.name}`);

          // Create a separate timeline row for EACH scenario
          for (let scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {
            const scenario = scenarios[scenarioIndex];
            const scenarioData = scenario.data as any;
            const selections = scenarioData?.propertySelections || {};
            const profile = scenarioData?.investmentProfile || {};

            console.log(`  Scenario "${scenario.name}":`, selections);

            // Extract purchases from this scenario
            const scenarioPurchases: TimelinePurchase[] = [];
            
            // Check if we have a saved timeline snapshot (the "truth" from the dashboard)
            const timelineSnapshot = scenarioData?.timelineSnapshot;
            
            if (timelineSnapshot && Array.isArray(timelineSnapshot) && timelineSnapshot.length > 0) {
              // USE SAVED SNAPSHOT - This is the accurate timeline from the dashboard
              console.log(`    Using saved timeline snapshot with ${timelineSnapshot.length} properties`);
              
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
                  
                  console.log(`    Snapshot property: "${item.title}" in year ${year}, cost: $${cost}`);
                  
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
              console.log(`    No timeline snapshot found, using fallback calculation`);
              let propertyNumber = 1;

              Object.entries(selections).forEach(([propertyId, quantity]) => {
                const qty = quantity as number;
                
                // propertyId is like "property_0", "property_7", etc.
                // Extract the index number
                const match = propertyId.match(/property_(\d+)/);
                if (!match || qty === 0) {
                  console.log(`    Skipping ${propertyId} (qty: ${qty})`);
                  return;
                }
                
                const propertyIndex = parseInt(match[1], 10);
                
                // Find the matching assumption by index from global propertyAssumptions
                const assumption = propertyAssumptions[propertyIndex];
                
                if (!assumption) {
                  console.warn(`    WARNING: No property assumption found at index ${propertyIndex} (${propertyId})`);
                  console.warn(`    Available assumptions:`, propertyAssumptions.map((a, i) => `${i}: ${a.type}`));
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
                  
                  console.log(`    Fallback: Creating ${qty} purchases of "${assumption.type}", starting year ${estimatedYear} (depositPool: $${depositPool}, totalDepositNeeded: $${totalDepositNeeded}, shortfall: $${shortfall}, yearsNeeded: ${yearsNeeded})`);
                  
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

            console.log(`Total purchases for ${client.name} - ${scenario.name}: ${scenarioPurchases.length}`);
            
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
          console.error(`Error loading timeline data for client ${client.id}:`, error);
        }
      }

      console.log(`useAllClientScenarios: Final timeline data with ${allClientTimelines.length} rows:`, allClientTimelines);
      console.log(`useAllClientScenarios: Summary:`, allClientTimelines.map(t => ({
        id: t.id,
        name: t.name,
        scenario: t.scenarioName,
        purchaseCount: t.purchases.length
      })));
      
      setTimelineData(allClientTimelines);
      setLoading(false);
    };

    fetchAllScenarios();
  }, [clients, propertyAssumptions]);

  return { timelineData, loading };
};

