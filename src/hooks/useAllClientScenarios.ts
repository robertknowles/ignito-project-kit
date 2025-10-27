import { useState, useEffect } from 'react';
import { useClient } from '../contexts/ClientContext';

export interface TimelinePurchase {
  year: number;
  propertyType: 'Unit' | 'House' | 'Apartment' | 'Other';
  cost: number;
  propertyNumber: number;
}

export interface TimelineClient {
  id: string;
  name: string;
  avatar?: string;
  purchases: TimelinePurchase[];
}

/**
 * Hook to fetch all client scenarios and extract property timeline data
 * 
 * This hook reads from localStorage to find saved scenario data for each client,
 * then extracts property information to display on the Planning Calendar.
 * 
 * Data sources:
 * - `scenario_${clientId}` - Contains propertySelections, propertyAssumptions, investmentProfile
 * - `property_selections_${clientId}` - Fallback for selections
 */
export const useAllClientScenarios = () => {
  const { clients } = useClient();
  const [timelineData, setTimelineData] = useState<TimelineClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllScenarios = async () => {
      if (clients.length === 0) {
        setTimelineData([]);
        setLoading(false);
        return;
      }

      const allClientTimelines: TimelineClient[] = [];

      for (const client of clients) {
        try {
          console.log(`Loading scenario for client ${client.id}: ${client.name}`);
          
          // First try to load from saved scenario (this has everything)
          const scenarioKey = `scenario_${client.id}`;
          const savedScenario = localStorage.getItem(scenarioKey);
          
          let selections: any = {};
          let assumptions: any[] = [];
          let profile: any = {};
          
          if (savedScenario) {
            console.log(`Found scenario for ${client.name}`);
            const scenarioData = JSON.parse(savedScenario);
            selections = scenarioData.propertySelections || {};
            assumptions = scenarioData.propertyAssumptions || [];
            profile = scenarioData.investmentProfile || {};
          } else {
            // Fallback: try individual keys
            console.log(`No scenario found, trying individual keys for ${client.name}`);
            const selectionsKey = `property_selections_${client.id}`;
            const savedSelections = localStorage.getItem(selectionsKey);
            if (savedSelections) {
              selections = JSON.parse(savedSelections);
            }
            
            const profileKey = `investment_profile_${client.id}`;
            const savedProfile = localStorage.getItem(profileKey);
            if (savedProfile) {
              profile = JSON.parse(savedProfile);
            }
            
            // Property assumptions are global, so we can't get them per-client
            // Skip this client if we don't have scenario data
            console.log(`Skipping ${client.name} - no complete scenario data`);
            continue;
          }

          console.log(`Selections for ${client.name}:`, selections);
          console.log(`Assumptions count: ${assumptions.length}`);
          
          // Extract purchases from selections and calculate rough years
          const purchases: TimelinePurchase[] = [];
          let propertyNumber = 1;
          
          Object.entries(selections).forEach(([propertyId, quantity]) => {
            const qty = quantity as number;
            console.log(`  Property ${propertyId}: quantity ${qty}`);
            
            // propertyId is like "property_0", "property_7", etc.
            // Extract the index number
            const match = propertyId.match(/property_(\d+)/);
            if (!match || qty === 0) {
              console.log(`    Skipping ${propertyId} - invalid format or qty is 0`);
              return;
            }
            
            const propertyIndex = parseInt(match[1], 10);
            console.log(`    Property index: ${propertyIndex}`);
            
            // Find the matching assumption by index
            const assumption = assumptions[propertyIndex];
            
            if (assumption && qty > 0) {
              console.log(`    Found assumption at index ${propertyIndex}:`, assumption);
              
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
              
              // Simple year calculation: based on deposit pool and annual savings
              const baseYear = 2025;
              const annualSavings = profile.annualSavings || 50000;
              const yearsNeeded = Math.ceil((depositAmount * propertyNumber) / annualSavings);
              const estimatedYear = baseYear + yearsNeeded;
              
              console.log(`    Creating ${qty} purchases of "${assumption.type}", starting year ${estimatedYear}`);
              
              // Add one purchase for each quantity
              for (let i = 0; i < qty; i++) {
                purchases.push({
                  year: estimatedYear + (i * 2), // Space them 2 years apart
                  propertyType: propertyType,
                  cost: cost,
                  propertyNumber: propertyNumber++,
                });
              }
            } else {
              console.log(`    No assumption found at index ${propertyIndex}`);
            }
          });

          console.log(`Total purchases for ${client.name}: ${purchases.length}`);
          
          // Only add client if they have purchases
          if (purchases.length > 0) {
            allClientTimelines.push({
              id: client.id.toString(),
              name: client.name,
              avatar: `https://i.pravatar.cc/150?img=${client.id}`,
              purchases: purchases.sort((a, b) => a.year - b.year),
            });
          }
        } catch (error) {
          console.error(`Error loading timeline data for client ${client.id}:`, error);
        }
      }

      console.log(`Final timeline data:`, allClientTimelines);
      setTimelineData(allClientTimelines);
      setLoading(false);
    };

    fetchAllScenarios();
  }, [clients]);

  return { timelineData, loading };
};

