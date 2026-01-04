import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface BrandingData {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

interface InvestmentProfileFormData {
  depositPool: number;
  borrowingCapacity: number;
  annualSavings: number;
  portfolioValue: number;
  currentDebt: number;
  timelineYears: number;
  equityGoal: number;
  cashflowGoal: number;
}

const defaultFormData: InvestmentProfileFormData = {
  depositPool: 50000,
  borrowingCapacity: 500000,
  annualSavings: 24000,
  portfolioValue: 0,
  currentDebt: 0,
  timelineYears: 15,
  equityGoal: 1000000,
  cashflowGoal: 50000,
};

const defaultBranding: BrandingData = {
  companyName: 'PropPath',
  logoUrl: null,
  primaryColor: '#3b82f6',
  secondaryColor: '#6366f1',
};

// Format currency for display
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);
};

// Slider styles - matching ClientInputsPanel
const sliderClassName = "w-full appearance-none cursor-pointer bg-slate-200 rounded-full h-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-all";

const getSliderStyle = (value: number, min: number, max: number, primaryColor: string) => ({
  background: `linear-gradient(to right, ${primaryColor} 0%, ${primaryColor} ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`,
});

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
}) => {
  const [isActive, setIsActive] = useState(false);

  const displayValue = formatAsCurrency 
    ? formatCurrency(value) 
    : suffix ? `${value} ${suffix}` : value.toString();

  return (
    <div 
      className={`bg-white rounded-xl border px-5 py-4 transition-all duration-150 ${
        isActive 
          ? 'border-slate-400 shadow-md' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Header: Label and Value */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <span className="text-sm font-semibold text-slate-700">
            {label}
          </span>
          {description && (
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
        <span 
          className="text-lg font-bold"
          style={{ color: primaryColor }}
        >
          {displayValue}
        </span>
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
          value={value}
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
        <span className="text-xs text-slate-400">{minLabel}</span>
        <span className="text-xs text-slate-400">{maxLabel}</span>
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
  const [scenarioId, setScenarioId] = useState<number | null>(null);
  const [clientName, setClientName] = useState<string>('');

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
          .select('id, data, company_id, client_display_name')
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

        // Pre-fill form with existing investment profile if available
        const existingData = scenarioData.data as any;
        if (existingData?.investmentProfile) {
          setFormData({
            depositPool: existingData.investmentProfile.depositPool ?? defaultFormData.depositPool,
            borrowingCapacity: existingData.investmentProfile.borrowingCapacity ?? defaultFormData.borrowingCapacity,
            annualSavings: existingData.investmentProfile.annualSavings ?? defaultFormData.annualSavings,
            portfolioValue: existingData.investmentProfile.portfolioValue ?? defaultFormData.portfolioValue,
            currentDebt: existingData.investmentProfile.currentDebt ?? defaultFormData.currentDebt,
            timelineYears: existingData.investmentProfile.timelineYears ?? defaultFormData.timelineYears,
            equityGoal: existingData.investmentProfile.equityGoal ?? defaultFormData.equityGoal,
            cashflowGoal: existingData.investmentProfile.cashflowGoal ?? defaultFormData.cashflowGoal,
          });
        }

        // Fetch company branding if company_id exists
        if (scenarioData.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('name, logo_url, primary_color, secondary_color')
            .eq('id', scenarioData.company_id)
            .single();

          if (!companyError && companyData) {
            setBranding({
              companyName: companyData.name || defaultBranding.companyName,
              logoUrl: companyData.logo_url,
              primaryColor: companyData.primary_color || defaultBranding.primaryColor,
              secondaryColor: companyData.secondary_color || defaultBranding.secondaryColor,
            });
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching onboarding data:', err);
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

      // Merge the new investment profile with existing data
      const existingData = (currentScenario?.data as any) || {};
      const updatedData = {
        ...existingData,
        investmentProfile: {
          ...existingData.investmentProfile,
          ...formData,
          // Preserve advanced settings that clients shouldn't modify
          equityFactor: existingData.investmentProfile?.equityFactor ?? 0.75,
          baseSalary: existingData.investmentProfile?.baseSalary ?? 60000,
          salaryServiceabilityMultiplier: existingData.investmentProfile?.salaryServiceabilityMultiplier ?? 4.0,
          serviceabilityRatio: existingData.investmentProfile?.serviceabilityRatio ?? 1.2,
          equityReleaseFactor: existingData.investmentProfile?.equityReleaseFactor ?? 0.35,
          depositBuffer: existingData.investmentProfile?.depositBuffer ?? 40000,
          rentFactor: existingData.investmentProfile?.rentFactor ?? 0.75,
          growthCurve: existingData.investmentProfile?.growthCurve ?? {
            year1: 12.5,
            years2to3: 10,
            year4: 7.5,
            year5plus: 6,
          },
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
    } catch (err) {
      console.error('Error submitting onboarding form:', err);
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
    <div 
      className="min-h-screen py-12 px-4"
      style={{ backgroundColor: branding.primaryColor + '05' }}
    >
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
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Welcome{clientName ? `, ${clientName}` : ''}!
          </h1>
          <p className="text-gray-600 text-lg">
            Adjust the sliders below to tell us about your financial situation and investment goals.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Details Section */}
            <div>
              <h3 
                className="text-sm font-semibold uppercase tracking-wider mb-4 pb-2 border-b"
                style={{ color: branding.primaryColor }}
              >
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
              <h3 
                className="text-sm font-semibold uppercase tracking-wider mb-4 pb-2 border-b"
                style={{ color: branding.primaryColor }}
              >
                Current Portfolio (if any)
              </h3>
              <div className="flex flex-col gap-4">
                <SliderField
                  label="Current Property Value"
                  description="Total value of existing investment properties"
                  value={formData.portfolioValue}
                  onChange={(val) => setFormData(prev => ({ ...prev, portfolioValue: val }))}
                  min={0}
                  max={5000000}
                  step={50000}
                  minLabel="$0"
                  maxLabel="$5M"
                  primaryColor={branding.primaryColor}
                />

                <SliderField
                  label="Current Investment Debt"
                  description="Outstanding mortgage on investment properties"
                  value={formData.currentDebt}
                  onChange={(val) => setFormData(prev => ({ ...prev, currentDebt: val }))}
                  min={0}
                  max={4000000}
                  step={50000}
                  minLabel="$0"
                  maxLabel="$4M"
                  primaryColor={branding.primaryColor}
                />
              </div>
            </div>

            {/* Investment Goals Section */}
            <div>
              <h3 
                className="text-sm font-semibold uppercase tracking-wider mb-4 pb-2 border-b"
                style={{ color: branding.primaryColor }}
              >
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
                  description="Target passive income from properties"
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

            <p className="text-center text-xs text-gray-400 mt-4">
              Your information is secure and will only be shared with your assigned agent.
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          Powered by {branding.companyName}
        </p>
      </div>
    </div>
  );
};
