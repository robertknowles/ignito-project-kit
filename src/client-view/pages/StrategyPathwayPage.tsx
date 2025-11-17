import React, { useMemo } from 'react'

import { Building2, Home, TrendingUp, Target } from 'lucide-react'
import { 
  analyzePortfolioStrategy,
  generateResidentialDescription,
  generateCommercialDescription,
  generateSavingsDescription,
  generateLongTermDescription
} from '../utils/strategyAnalyzer'

interface StrategyPathwayPageProps {
  investmentProfile: any;
  propertySelections: any[];
}

export function StrategyPathwayPage({ investmentProfile, propertySelections }: StrategyPathwayPageProps) {
  // Analyze portfolio strategy
  const analysis = useMemo(() => {
    return analyzePortfolioStrategy(propertySelections, investmentProfile);
  }, [propertySelections, investmentProfile]);

  // Generate descriptions for each section
  const residentialDesc = useMemo(() => {
    return analysis.residential 
      ? generateResidentialDescription(analysis.residential, investmentProfile)
      : null;
  }, [analysis.residential, investmentProfile]);

  const commercialDesc = useMemo(() => {
    return analysis.commercial 
      ? generateCommercialDescription(analysis.commercial)
      : null;
  }, [analysis.commercial]);

  const savingsDesc = useMemo(() => {
    return generateSavingsDescription(investmentProfile, analysis.savingsProjection);
  }, [investmentProfile, analysis.savingsProjection]);

  const longTermDesc = useMemo(() => {
    return generateLongTermDescription(analysis, investmentProfile);
  }, [analysis, investmentProfile]);

  // If no properties, show empty state
  if (!analysis.residential && !analysis.commercial) {
    return (
      <div className="w-full min-h-[297mm] bg-[#f9fafb] p-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-2">No portfolio strategy available</p>
          <p className="text-gray-500 text-sm">Add properties to your investment plan to see the strategy overview.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full min-h-[297mm] bg-[#f9fafb] p-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-gray-500 mb-1">Detailed Investment Plan</p>
        <h1
          className="text-3xl font-semibold text-gray-900 mb-6"
          style={{
            fontFamily: 'Figtree, sans-serif',
          }}
        >
          Commercial and Residential Portfolio Overview
        </h1>
        <p className="text-sm text-gray-600">Investment Strategy Overview</p>
      </div>
      
      {/* Residential Portfolio Section - Only show if residential properties exist */}
      {residentialDesc && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-5 h-5 text-blue-500" />
            <h2
              className="text-xl font-semibold text-gray-900"
              style={{
                fontFamily: 'Figtree, sans-serif',
              }}
            >
              Residential Portfolio
            </h2>
          </div>
          <div className="space-y-3 text-sm text-gray-700">
            {residentialDesc.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-gray-500">•</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-2 text-sm">
              {residentialDesc.targets.map((target, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-blue-500">→</span>
                  <p className="text-gray-900">{target}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Savings & Cashflow Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h2
            className="text-xl font-semibold text-gray-900"
            style={{
              fontFamily: 'Figtree, sans-serif',
            }}
          >
            Savings & Cashflow
          </h2>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          {savingsDesc.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-gray-500">•</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Commercial Scenario Section - Only show if commercial properties exist */}
      {commercialDesc && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-500" />
            <h2
              className="text-xl font-semibold text-gray-900"
              style={{
                fontFamily: 'Figtree, sans-serif',
              }}
            >
              Commercial Portfolio
            </h2>
          </div>
          <div className="space-y-3 text-sm text-gray-700">
            {commercialDesc.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-gray-500">•</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-2 text-sm">
              {commercialDesc.targets.map((target, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-blue-500">→</span>
                  <p className="text-gray-900">{target}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Long-Term Outcome Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-blue-600" />
          <h2
            className="text-xl font-semibold text-gray-900"
            style={{
              fontFamily: 'Figtree, sans-serif',
            }}
          >
            Long-Term Outcome
          </h2>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          {longTermDesc.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Footer */}
      <div className="mt-8 flex justify-between items-center">
        <div className="text-sm font-semibold text-gray-900">IGNITO</div>
        <div className="text-sm text-gray-500">Page 4</div>
      </div>
    </div>
  )
}

