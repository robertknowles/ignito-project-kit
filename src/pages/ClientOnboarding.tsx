import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface BrandingData {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
}

interface InvestmentProfileFormData {
  depositPool: number;
  borrowingCapacity: number;
  annualSavings: number;
  timelineYears: number;
  equityGoal: number;
  cashflowGoal: number;
  // Advanced portfolio settings
  useExistingEquity: boolean;
  maxPurchasesPerYear: number;
  existingPortfolioGrowthRate: number;
}

const defaultFormData: InvestmentProfileFormData = {
  depositPool: 50000,
  borrowingCapacity: 500000,
  annualSavings: 24000,
  timelineYears: 20,
  equityGoal: 1000000,
  cashflowGoal: 50000,
  // Advanced portfolio settings
  useExistingEquity: true,
  maxPurchasesPerYear: 3,
  existingPortfolioGrowthRate: 0.05,
};

// ---- Existing portfolio (per-property) ------------------------------------
// Clients enter each investment property they already own rather than a single
// aggregate. Value/debt sum into the engine's portfolioValue/currentDebt and
// the weekly rents roll up into existingAnnualRent (weekly x 52). The full
// per-property list is stored verbatim in clientSubmittedInputs so the agent
// can brief the purchase correctly (yield + entity per property).
export const ENTITY_OPTIONS = ['Personal', 'Company', 'Trust', 'SMSF'] as const;
export type PropertyEntity = (typeof ENTITY_OPTIONS)[number];

export interface ExistingProperty {
  value: number;      // current market value
  debt: number;       // outstanding loan balance
  weeklyRent: number; // gross rent per week
  entity: PropertyEntity;
}

const MAX_EXISTING_PROPERTIES = 6;

const blankProperty = (): ExistingProperty => ({ value: 0, debt: 0, weeklyRent: 0, entity: 'Personal' });

const grossYieldPct = (value: number, weeklyRent: number): number =>
  value > 0 ? ((weeklyRent * 52) / value) * 100 : 0;

const aggregatePortfolio = (properties: ExistingProperty[]) => ({
  portfolioValue: properties.reduce((sum, p) => sum + (p.value || 0), 0),
  currentDebt: properties.reduce((sum, p) => sum + (p.debt || 0), 0),
  existingAnnualRent: properties.reduce((sum, p) => sum + (p.weeklyRent || 0) * 52, 0),
});

const defaultBranding: BrandingData = {
  companyName: 'PropPath',
  logoUrl: null,
  primaryColor: '#6b7280',
};

// Format currency for display
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);
};

// Slider styles - white thumb with grey border, branded filled track
const sliderClassName = "w-full appearance-none cursor-pointer bg-gray-200 rounded-full h-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-[1.5px] [&::-webkit-slider-thumb]:border-[#9CA3AF] [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgba(0,0,0,0.1)] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-[1.5px] [&::-moz-range-thumb]:border-[#9CA3AF] [&::-moz-range-thumb]:shadow-[0_1px_2px_rgba(0,0,0,0.1)] active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-all";

const getSliderStyle = (value: number, min: number, max: number, primaryColor: string) => {
  // Clamp so a typed-in value outside the slider's range never overflows the fill.
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return {
    background: `linear-gradient(to right, ${primaryColor} 0%, ${primaryColor} ${pct}%, #E9EAEB ${pct}%, #E9EAEB 100%)`,
  };
};

interface SliderFieldProps {
  label: string;
  description?: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  maxLabel: string;
  formatAsCurrency?: boolean;
  suffix?: string;
  primaryColor: string;
  footer?: React.ReactNode;
}

const SliderField: React.FC<SliderFieldProps> = ({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  formatAsCurrency = true,
  suffix,
  primaryColor,
  footer,
}) => {
  const [isActive, setIsActive] = useState(false);

  // The value is editable: clients can drag the slider OR type an exact figure.
  // Strip non-digits so "$1,250,000" style input still parses to a number.
  const handleTyped = (raw: string) => onChange(Number(raw.replace(/[^0-9]/g, '')) || 0);

  return (
    <div
      className={`bg-white rounded-xl border px-5 py-4 transition-all duration-150 ${
        isActive ? 'border-[#D5D7DA] shadow-sm' : 'border-[#E9EAEB] hover:border-[#D5D7DA]'
      }`}
    >
      {/* Header: Label and editable Value */}
      <div className="flex justify-between items-start mb-1 gap-3">
        <div>
          <span className="text-sm font-semibold text-[#414651]">{label}</span>
          {description && (
            <p className="text-xs text-[#717680] mt-0.5">{description}</p>
          )}
        </div>
        <div className="relative flex-shrink-0">
          {formatAsCurrency && (
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-medium pointer-events-none"
              style={{ color: primaryColor }}
            >
              $
            </span>
          )}
          <input
            type="text"
            inputMode="numeric"
            value={value ? value.toLocaleString('en-AU') : ''}
            onChange={(e) => handleTyped(e.target.value)}
            className={`w-40 py-1.5 text-right text-base font-medium rounded-lg border border-[#E9EAEB] bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent ${
              formatAsCurrency ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-14' : 'px-3'
            }`}
            style={{ color: primaryColor }}
            aria-label={label}
          />
          {!formatAsCurrency && suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#717680] pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
      </div>

      {/* Slider Track */}
      <div className="mt-3">
        <input
          type="range"
          className={sliderClassName}
          style={getSliderStyle(value, min, max, primaryColor)}
          min={min}
          max={max}
          step={step}
          value={Math.min(Math.max(value, min), max)}
          onChange={(e) => onChange(parseInt(e.target.value))}
          onMouseDown={() => setIsActive(true)}
          onMouseUp={() => setIsActive(false)}
          onMouseLeave={() => setIsActive(false)}
          onTouchStart={() => setIsActive(true)}
          onTouchEnd={() => setIsActive(false)}
        />
      </div>

      {/* Min/Max Labels */}
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-[#717680]">{minLabel}</span>
        <span className="text-xs text-[#717680]">{maxLabel}</span>
      </div>

      {footer && <div className="mt-2.5">{footer}</div>}
    </div>
  );
};

// Compact $ input used inside each property card. Stores a plain number, shows
// a comma-formatted value with a leading $ so long numbers stay readable.
interface CurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#717680] text-sm pointer-events-none">$</span>
    <input
      type="text"
      inputMode="numeric"
      value={value ? value.toLocaleString('en-AU') : ''}
      onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
      placeholder={placeholder}
      className="w-full pl-7 pr-3 py-2.5 border border-[#D5D7DA] rounded-lg text-sm text-[#414651] focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
    />
  </div>
);

interface PropertyCardProps {
  index: number;
  property: ExistingProperty;
  onChange: (next: ExistingProperty) => void;
  primaryColor: string;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ index, property, onChange, primaryColor }) => {
  const yieldPct = grossYieldPct(property.value, property.weeklyRent);
  const equity = property.value - property.debt;
  const patch = (changes: Partial<ExistingProperty>) => onChange({ ...property, ...changes });

  return (
    <div className="bg-white rounded-xl border border-[#E9EAEB] px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-[#414651]">Property {index + 1}</span>
        {property.value > 0 && (
          <span className="text-xs text-[#717680]">
            Equity {formatCurrency(equity)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-[#717680] mb-1 block">Current value</label>
          <CurrencyInput value={property.value} onChange={(v) => patch({ value: v })} placeholder="450,000" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#717680] mb-1 block">Current debt</label>
          <CurrencyInput value={property.debt} onChange={(v) => patch({ debt: v })} placeholder="300,000" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#717680] mb-1 block">Weekly rent</label>
          <CurrencyInput value={property.weeklyRent} onChange={(v) => patch({ weeklyRent: v })} placeholder="520" />
          <p className="text-xs mt-1" style={{ color: property.value > 0 && property.weeklyRent > 0 ? primaryColor : '#717680' }}>
            {property.value > 0 && property.weeklyRent > 0
              ? `${yieldPct.toFixed(1)}% gross yield`
              : 'Add value + rent for yield'}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-[#717680] mb-1 block">Owned by</label>
          <select
            value={property.entity}
            onChange={(e) => patch({ entity: e.target.value as PropertyEntity })}
            className="w-full px-3 py-2.5 border border-[#D5D7DA] rounded-lg text-sm text-[#414651] bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
          >
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export const ClientOnboarding = () => {
  const { onboardingId } = useParams<{ onboardingId: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<BrandingData>(defaultBranding);
  const [formData, setFormData] = useState<InvestmentProfileFormData>(defaultFormData);
  // Existing investment properties the client already owns (per-property).
  const [properties, setProperties] = useState<ExistingProperty[]>([]);
  // Resize the property list from the "how many" dropdown, preserving any
  // details already entered for the properties that remain.
  const setPropertyCount = (count: number) =>
    setProperties(prev => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push(blankProperty());
      return next;
    });
  const updateProperty = (index: number, next: ExistingProperty) =>
    setProperties(prev => prev.map((p, i) => (i === index ? next : p)));
  const portfolioTotals = aggregatePortfolio(properties);
  const [scenarioId, setScenarioId] = useState<number | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [agentName, setAgentName] = useState<string>('');
  const [agencyName, setAgencyName] = useState<string>('');

  // Fetch scenario and branding data
  useEffect(() => {
    const fetchData = async () => {
      if (!onboardingId) {
        setError('Invalid onboarding link');
        setLoading(false);
        return;
      }

      try {
        // Fetch scenario by onboarding_id
        const { data: scenarioData, error: scenarioError } = await supabase
          .from('scenarios')
          .select('id, data, company_id, client_display_name, agent_display_name, company_display_name')
          .eq('onboarding_id', onboardingId)
          .single();

        if (scenarioError) {
          if (scenarioError.code === 'PGRST116') {
            setError('This onboarding link is invalid or has expired.');
          } else {
            throw scenarioError;
          }
          setLoading(false);
          return;
        }

        if (!scenarioData) {
          setError('Onboarding form not found');
          setLoading(false);
          return;
        }

        setScenarioId(scenarioData.id);
        setClientName(scenarioData.client_display_name || '');
        setAgentName(scenarioData.agent_display_name || '');
        setAgencyName(scenarioData.company_display_name || '');

        // Pre-fill form with existing investment profile if available
        const existingData = scenarioData.data as any;
        const ip = existingData?.investmentProfile;
        if (ip) {
          setFormData({
            depositPool: ip.depositPool ?? defaultFormData.depositPool,
            borrowingCapacity: ip.borrowingCapacity ?? defaultFormData.borrowingCapacity,
            annualSavings: ip.annualSavings ?? defaultFormData.annualSavings,
            timelineYears: ip.timelineYears ?? defaultFormData.timelineYears,
            equityGoal: ip.equityGoal ?? defaultFormData.equityGoal,
            cashflowGoal: ip.cashflowGoal ?? defaultFormData.cashflowGoal,
            // Advanced portfolio settings
            useExistingEquity: ip.useExistingEquity ?? defaultFormData.useExistingEquity,
            maxPurchasesPerYear: ip.maxPurchasesPerYear ?? defaultFormData.maxPurchasesPerYear,
            existingPortfolioGrowthRate: ip.existingPortfolioGrowthRate ?? defaultFormData.existingPortfolioGrowthRate,
          });
        }

        // Restore the per-property list. Newer submissions store it verbatim in
        // clientSubmittedInputs; older ones only have aggregate portfolioValue /
        // currentDebt, so seed a single property from those so nothing is lost.
        const savedProperties = existingData?.clientSubmittedInputs?.existingProperties;
        if (Array.isArray(savedProperties) && savedProperties.length > 0) {
          setProperties(
            savedProperties.slice(0, MAX_EXISTING_PROPERTIES).map((p: any) => ({
              value: Number(p?.value) || 0,
              debt: Number(p?.debt) || 0,
              weeklyRent: Number(p?.weeklyRent) || 0,
              entity: (ENTITY_OPTIONS as readonly string[]).includes(p?.entity) ? p.entity : 'Personal',
            })),
          );
        } else if (ip && (ip.portfolioValue > 0 || ip.currentDebt > 0)) {
          setProperties([{
            value: ip.portfolioValue || 0,
            debt: ip.currentDebt || 0,
            weeklyRent: Math.round((ip.existingAnnualRent || 0) / 52),
            entity: 'Personal',
          }]);
        }

        // Fetch company branding if company_id exists
        if (scenarioData.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('name, logo_url, primary_color')
            .eq('id', scenarioData.company_id)
            .single();

          if (!companyError && companyData) {
            setBranding({
              companyName: companyData.name || defaultBranding.companyName,
              logoUrl: companyData.logo_url,
              primaryColor: companyData.primary_color || defaultBranding.primaryColor,
            });
          }
        }

        setLoading(false);
      } catch (err) {
setError('Failed to load onboarding form');
        setLoading(false);
      }
    };

    fetchData();
  }, [onboardingId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scenarioId || !onboardingId) {
      setError('Unable to submit form. Please try again.');
      return;
    }

    setSubmitting(true);

    try {
      // First fetch the current scenario data
      const { data: currentScenario, error: fetchError } = await supabase
        .from('scenarios')
        .select('data')
        .eq('onboarding_id', onboardingId)
        .single();

      if (fetchError) throw fetchError;

      // Roll the per-property list up into the aggregates the engine consumes.
      const portfolioAggregates = aggregatePortfolio(properties);

      // Merge the new investment profile with existing data
      const existingData = (currentScenario?.data as any) || {};
      const updatedData = {
        ...existingData,
        investmentProfile: {
          ...existingData.investmentProfile,
          ...formData,
          ...portfolioAggregates,
          // Preserve advanced settings that clients shouldn't modify.
          // Fallbacks updated 2026-04-29 to Aggressive Pacing defaults
          // per BA-research calibration.
          equityFactor: existingData.investmentProfile?.equityFactor ?? 0.80,
          baseSalary: existingData.investmentProfile?.baseSalary ?? 60000,
          salaryServiceabilityMultiplier: existingData.investmentProfile?.salaryServiceabilityMultiplier ?? 6.0,
          serviceabilityRatio: existingData.investmentProfile?.serviceabilityRatio ?? 1.2,
          equityReleaseFactor: existingData.investmentProfile?.equityReleaseFactor ?? 0.70,
          depositBuffer: existingData.investmentProfile?.depositBuffer ?? 5000,
          rentFactor: existingData.investmentProfile?.rentFactor ?? 0.75,
          // Matches Medium tier per Gameplans-replication calibration (2026-04-30).
          // Fallback when existing onboarding data has no saved growthCurve.
          growthCurve: existingData.investmentProfile?.growthCurve ?? {
            year1: 6,
            years2to3: 5.5,
            year4: 5,
            year5plus: 5,
          },
        },
        // Verbatim snapshot of what the client submitted. Kept separate from
        // investmentProfile (which gets merged with advanced settings and can
        // later be edited from the dashboard) so the agent always has a
        // faithful record of the client's raw answers. Purely informational -
        // nothing in the calculation engine reads this key.
        clientSubmittedInputs: {
          ...formData,
          ...portfolioAggregates,
          // Full per-property breakdown so the agent can brief accurately
          // (value, debt, weekly rent / yield and holding entity per property).
          existingProperties: properties,
          submittedAt: new Date().toISOString(),
        },
        // Mark onboarding as completed
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
      };

      // Update the scenario with new investment profile
      const { error: updateError } = await supabase
        .from('scenarios')
        .update({
          data: updatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('onboarding_id', onboardingId);

      if (updateError) throw updateError;

      setSubmitted(true);

      // Notify the agent that the client completed the form (fire-and-forget).
      // The edge function uses the service-role key to look up the agent's
      // email, since this page is public and has no auth context.
      try {
        await supabase.functions.invoke('send-onboarding-form', {
          body: {
            onboardingId,
            notifyAgent: true,
            formData: { ...formData, ...portfolioAggregates },
          },
        });
      } catch {
        // Non-critical - don't block the client's success screen
      }
    } catch (err) {
setError('Failed to submit your details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: branding.primaryColor + '10' }}
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: branding.primaryColor }} />
          <p className="text-gray-600 text-lg">Loading your onboarding form...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Oops!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: branding.primaryColor + '08' }}
      >
        <div className="text-center max-w-lg mx-auto px-6">
          {branding.logoUrl && (
            <img 
              src={branding.logoUrl} 
              alt={branding.companyName} 
              className="h-12 mx-auto mb-8 object-contain"
            />
          )}
          <div 
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: branding.primaryColor + '20' }}
          >
            <CheckCircle2 className="h-10 w-10" style={{ color: branding.primaryColor }} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Your details have been sent to your agent. They will contact you shortly to review your investment roadmap.
          </p>
          <p className="text-gray-400 text-sm mt-8">
            Powered by {branding.companyName}
          </p>
        </div>
      </div>
    );
  }

  // Form state with sliders
  return (
    <div className="min-h-screen py-12 px-4 bg-[#FAFAFA]">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.companyName}
              className="h-14 mx-auto mb-6 object-contain"
            />
          ) : (
            <h2
              className="text-2xl font-bold mb-6"
              style={{ color: branding.primaryColor }}
            >
              {branding.companyName}
            </h2>
          )}
          <h1 className="text-3xl font-bold text-[#181D27] mb-3">
            Welcome{clientName ? `, ${clientName}` : ''}!
          </h1>
          <p className="text-[#414651] text-lg mb-1.5">
            Your investment advisor is requesting your financial position and investment goals.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-[#E9EAEB]">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Details Section */}
            <div>
              <h3 className="text-[13px] font-semibold text-[#414651] mb-4 pb-2 border-b border-[#E9EAEB]">
                Your Financial Position
              </h3>
              <div className="flex flex-col gap-4">
                <SliderField
                  label="Available Deposit"
                  description="Cash available for property deposits"
                  value={formData.depositPool}
                  onChange={(val) => setFormData(prev => ({ ...prev, depositPool: val }))}
                  min={10000}
                  max={500000}
                  step={5000}
                  minLabel="$10k"
                  maxLabel="$500k"
                  primaryColor={branding.primaryColor}
                />

                <SliderField
                  label="Borrowing Capacity"
                  description="Pre-approved or estimated lending amount"
                  value={formData.borrowingCapacity}
                  onChange={(val) => setFormData(prev => ({ ...prev, borrowingCapacity: val }))}
                  min={100000}
                  max={2000000}
                  step={50000}
                  minLabel="$100k"
                  maxLabel="$2M"
                  primaryColor={branding.primaryColor}
                  footer={
                    <a
                      href="https://www.canstar.com.au/calculators/home-loan-borrowing-power-calculator/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
                      style={{ color: branding.primaryColor }}
                    >
                      Not sure? Calculate your borrowing power
                    </a>
                  }
                />

                <SliderField
                  label="Annual Savings"
                  description="How much you can save each year"
                  value={formData.annualSavings}
                  onChange={(val) => setFormData(prev => ({ ...prev, annualSavings: val }))}
                  min={0}
                  max={100000}
                  step={1000}
                  minLabel="$0"
                  maxLabel="$100k"
                  primaryColor={branding.primaryColor}
                />
              </div>
            </div>

            {/* Current Portfolio Section */}
            <div>
              <h3 className="text-[13px] font-semibold text-[#414651] mb-4 pb-2 border-b border-[#E9EAEB]">
                Current Portfolio (if any)
              </h3>
              <div className="flex flex-col gap-4">
                {/* How many properties → spawns a card per property */}
                <div className="bg-white rounded-xl border border-[#E9EAEB] px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-semibold text-[#414651]">Investment properties owned</span>
                    <p className="text-xs text-[#717680] mt-0.5">How many investment properties do you currently own?</p>
                  </div>
                  <select
                    value={properties.length}
                    onChange={(e) => setPropertyCount(Number(e.target.value))}
                    className="px-3 py-2.5 border border-[#D5D7DA] rounded-lg text-sm text-[#414651] bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                  >
                    {Array.from({ length: MAX_EXISTING_PROPERTIES + 1 }, (_, n) => (
                      <option key={n} value={n}>{n === 0 ? 'None' : n}</option>
                    ))}
                  </select>
                </div>

                {properties.map((property, i) => (
                  <PropertyCard
                    key={i}
                    index={i}
                    property={property}
                    onChange={(next) => updateProperty(i, next)}
                    primaryColor={branding.primaryColor}
                  />
                ))}

                {properties.length > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-[#F9FAFB] border border-[#E9EAEB]">
                    <span className="text-sm text-[#717680]">Portfolio totals</span>
                    <span className="text-sm font-normal text-[#414651] text-right">
                      {formatCurrency(portfolioTotals.portfolioValue)} value · {formatCurrency(portfolioTotals.currentDebt)} debt · {formatCurrency(portfolioTotals.portfolioValue - portfolioTotals.currentDebt)} equity
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Investment Goals Section */}
            <div>
              <h3 className="text-[13px] font-semibold text-[#414651] mb-4 pb-2 border-b border-[#E9EAEB]">
                Your Investment Goals
              </h3>
              <div className="flex flex-col gap-4">
                <SliderField
                  label="Investment Horizon"
                  description="How many years do you plan to invest?"
                  value={formData.timelineYears}
                  onChange={(val) => setFormData(prev => ({ ...prev, timelineYears: val }))}
                  min={5}
                  max={20}
                  step={1}
                  minLabel="5 yrs"
                  maxLabel="20 yrs"
                  formatAsCurrency={false}
                  suffix="years"
                  primaryColor={branding.primaryColor}
                />

                <SliderField
                  label="Equity Goal"
                  description="Target net worth from property investments"
                  value={formData.equityGoal}
                  onChange={(val) => setFormData(prev => ({ ...prev, equityGoal: val }))}
                  min={0}
                  max={5000000}
                  step={50000}
                  minLabel="$0"
                  maxLabel="$5M"
                  primaryColor={branding.primaryColor}
                />

                <SliderField
                  label="Annual Cashflow Goal"
                  description="Target rental income from properties"
                  value={formData.cashflowGoal}
                  onChange={(val) => setFormData(prev => ({ ...prev, cashflowGoal: val }))}
                  min={0}
                  max={200000}
                  step={5000}
                  minLabel="$0"
                  maxLabel="$200k"
                  primaryColor={branding.primaryColor}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 text-lg font-semibold rounded-xl transition-all hover:scale-[1.02]"
              style={{ 
                backgroundColor: branding.primaryColor,
                color: 'white',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit My Details'
              )}
            </Button>

            <p className="text-center text-xs text-[#717680] mt-4">
              Your information is secure and will only be shared with your assigned agent.
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[#717680] text-sm mt-8">
          Powered by {branding.companyName}
        </p>
      </div>
    </div>
  );
};
