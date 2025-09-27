import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useGrowthProjections } from '../hooks/useGrowthProjections';
import { ChevronDownIcon, ChevronUpIcon, TrendingUpIcon } from 'lucide-react';

export const GrowthProjections = () => {
  const { projections, keyMetrics, milestones, hasProjections } = useGrowthProjections();
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([2025, 2030, 2040]));

  const formatCurrency = (value: number) => {
    if (value === 0) return '$0';
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}k`;
    return `$${Math.round(value).toLocaleString()}`;
  };

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  if (!hasProjections) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUpIcon size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold">Growth Projections</h3>
        </div>
        <p className="text-gray-500">Select properties to see detailed growth projections over time.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUpIcon size={20} className="text-gray-600" />
        <h3 className="text-lg font-semibold">Portfolio Growth Projections</h3>
      </div>

      {/* Key Performance Summary */}
      <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
        <h4 className="font-medium mb-4 text-gray-800">Performance Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Total Growth</div>
            <div className="font-semibold text-green-600">{formatCurrency(keyMetrics.totalGrowth)}</div>
            <div className="text-xs text-gray-500">({keyMetrics.totalGrowthPercentage.toFixed(1)}%)</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Final Portfolio Value</div>
            <div className="font-semibold text-blue-600">{formatCurrency(keyMetrics.endValue)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Annual Income</div>
            <div className="font-semibold text-purple-600">{formatCurrency(keyMetrics.finalIncome)}</div>
          </div>
        </div>
      </div>

      {/* Key Milestones Overview */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-4 text-gray-800">Key Milestones</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {milestones.map((projection, index) => {
            const isStart = index === 0;
            const isEnd = index === milestones.length - 1;
            return (
              <div key={projection.year} className="text-center">
                <div className="text-xs text-gray-600 mb-1">
                  {isStart ? 'Start' : isEnd ? 'End Goal' : `Year ${projection.year}`}
                </div>
                <div className="font-semibold text-green-600 mb-1">
                  {formatCurrency(projection.portfolioValue)}
                </div>
                <div className="text-xs text-gray-500">
                  {projection.properties.length} {projection.properties.length === 1 ? 'property' : 'properties'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Year-by-Year Breakdown */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium">Year-by-Year Breakdown</h4>
          <div className="text-xs text-gray-500">
            Click years to expand property details
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {projections.filter((_, index) => index % 2 === 0 || index === projections.length - 1).map((projection) => (
            <div key={projection.year} className="border border-gray-200 rounded-lg overflow-hidden">
              <div 
                className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleYear(projection.year)}
              >
                <div className="flex items-center gap-4">
                  <span className="font-medium text-gray-800">{projection.year}</span>
                  <div className="text-sm text-gray-600">
                    Portfolio: <span className="font-medium text-green-600">{formatCurrency(projection.portfolioValue)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Equity: <span className="font-medium text-blue-600">{formatCurrency(projection.totalEquity)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Income: <span className="font-medium text-purple-600">{formatCurrency(projection.annualIncome)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="text-xs">{projection.properties.length} properties</span>
                  {expandedYears.has(projection.year) ? 
                    <ChevronUpIcon size={16} /> : 
                    <ChevronDownIcon size={16} />
                  }
                </div>
              </div>

              {expandedYears.has(projection.year) && projection.properties.length > 0 && (
                <div className="p-4 bg-white border-t">
                  <div className="grid gap-3">
                    {projection.properties.map((property, index) => (
                      <div key={property.propertyId} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium text-gray-800">{property.title}</span>
                          <div className="text-xs text-gray-500 mt-1">
                            Held for {property.yearsPurchased} {property.yearsPurchased === 1 ? 'year' : 'years'}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-700">
                            Value: <span className="font-medium">{formatCurrency(property.currentValue)}</span>
                          </div>
                          <div className="text-gray-700">
                            Equity: <span className="font-medium">{formatCurrency(property.equity)}</span>
                          </div>
                          <div className="text-gray-700">
                            Rent: <span className="font-medium">{formatCurrency(property.rentalIncome)}/yr</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p>* Projections assume continuous compound growth and stable rental yields.</p>
        <p>* Values shown are inflation-adjusted estimates based on current market assumptions.</p>
      </div>
    </Card>
  );
};