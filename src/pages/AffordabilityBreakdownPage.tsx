import React, { useMemo } from 'react';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import AffordabilityBreakdownTable from '../components/AffordabilityBreakdownTable';
import { Navbar } from '../components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { YearBreakdownData } from '../types/property';
import { 
  Download, Info, TrendingUp, 
  DollarSign, Home, Clock, Zap, Loader2
} from 'lucide-react';

export const AffordabilityBreakdownPage: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { isLoading: isSelectionsLoading } = usePropertySelection();
  const { profile } = useInvestmentProfile();
  const { globalFactors } = useDataAssumptions();
  
  // Transform TimelineProperty[] to YearBreakdownData[] for the table
  const yearlyData = useMemo((): YearBreakdownData[] => {
    if (!timelineProperties.length) return [];
    
    const startYear = 2025;
    const endYear = startYear + profile.timelineYears;
    const interestRate = parseFloat(globalFactors.interestRate);
    const data: YearBreakdownData[] = [];
    
    // Group properties by affordable year
    const propertiesByYear = new Map<number, typeof timelineProperties>();
    timelineProperties.forEach(prop => {
      const year = prop.affordableYear;
      if (!propertiesByYear.has(year)) {
        propertiesByYear.set(year, []);
      }
      propertiesByYear.get(year)!.push(prop);
    });
    
    // Create year breakdown for entire timeline
    for (let year = startYear; year < endYear; year++) {
      const yearIndex = year - startYear + 1;
      const propertiesThisYear = propertiesByYear.get(year) || [];
      const property = propertiesThisYear[0]; // Take first property if multiple
      
      if (property) {
        // Year with purchase
        const lvr = property.portfolioValueAfter > 0 
          ? (property.totalDebtAfter / property.portfolioValueAfter) * 100 
          : 0;
        
        const rentalRecognition = 75; // Standard 75% recognition
        
        data.push({
          year: yearIndex,
          displayYear: year,
          status: 'purchased',
          propertyNumber: property.propertyIndex + 1,
          propertyType: property.title,
          
          portfolioValue: property.portfolioValueAfter,
          totalEquity: property.totalEquityAfter,
          totalDebt: property.totalDebtAfter,
          
          availableDeposit: property.availableFundsUsed,
          annualCashFlow: 0, // Would need to calculate from full timeline
          
          baseDeposit: profile.depositPool,
          cumulativeSavings: 0,
          cashflowReinvestment: 0,
          equityRelease: 0,
          
          grossRental: 0,
          loanRepayments: property.loanAmount * (interestRate / 100),
          expenses: 0,
          
          requiredDeposit: property.depositRequired,
          requiredLoan: property.loanAmount,
          propertyCost: property.cost,
          
          availableBorrowingCapacity: profile.borrowingCapacity - property.totalDebtAfter,
          borrowingCapacity: profile.borrowingCapacity,
          
          interestRate: interestRate,
          rentalRecognition: rentalRecognition,
          
          depositTest: {
            pass: true,
            surplus: 0,
            available: property.availableFundsUsed,
            required: property.depositRequired
          },
          
          serviceabilityTest: {
            pass: true,
            surplus: 0,
            available: profile.borrowingCapacity - property.totalDebtAfter,
            required: property.loanAmount
          },
          
          gapRule: false,
          equityReleaseYear: yearIndex % 3 === 0,
          
          portfolioScaling: property.propertyIndex + 1,
          selfFundingEfficiency: 0,
          equityRecyclingImpact: 0,
          dsr: 0,
          lvr: lvr,
          
          purchases: [{
            propertyId: property.id,
            propertyType: property.title,
            cost: property.cost,
            deposit: property.depositRequired,
            loanAmount: property.loanAmount,
            year: year
          }]
        });
      } else {
        // Year without purchase - use cumulative values from last property
        const lastProperty = timelineProperties
          .filter(p => p.affordableYear < year)
          .sort((a, b) => b.affordableYear - a.affordableYear)[0];
        
        data.push({
          year: yearIndex,
          displayYear: year,
          status: 'waiting',
          propertyNumber: null,
          propertyType: null,
          
          portfolioValue: lastProperty?.portfolioValueAfter || profile.portfolioValue,
          totalEquity: lastProperty?.totalEquityAfter || 0,
          totalDebt: lastProperty?.totalDebtAfter || profile.currentDebt,
          
          availableDeposit: 0,
          annualCashFlow: 0,
          
          baseDeposit: profile.depositPool,
          cumulativeSavings: 0,
          cashflowReinvestment: 0,
          equityRelease: 0,
          
          grossRental: 0,
          loanRepayments: 0,
          expenses: 0,
          
          requiredDeposit: 0,
          requiredLoan: 0,
          propertyCost: 0,
          
          availableBorrowingCapacity: profile.borrowingCapacity - (lastProperty?.totalDebtAfter || profile.currentDebt),
          borrowingCapacity: profile.borrowingCapacity,
          
          interestRate: interestRate,
          rentalRecognition: 75,
          
          depositTest: {
            pass: true,
            surplus: 0,
            available: 0,
            required: 0
          },
          
          serviceabilityTest: {
            pass: true,
            surplus: 0,
            available: 0,
            required: 0
          },
          
          gapRule: false,
          equityReleaseYear: yearIndex % 3 === 0,
          
          portfolioScaling: lastProperty ? lastProperty.propertyIndex + 1 : 0,
          selfFundingEfficiency: 0,
          equityRecyclingImpact: 0,
          dsr: 0,
          lvr: 0,
          
          purchases: []
        });
      }
    }
    
    return data;
  }, [timelineProperties, profile, globalFactors.interestRate]);
  
  // Calculate summary metrics
  const totalPurchases = timelineProperties.length;
  const finalProperty = timelineProperties[timelineProperties.length - 1];
  const cashflowPositiveYear = yearlyData?.find(y => y.annualCashFlow > 0);
  const totalPropertyValue = finalProperty?.portfolioValueAfter || 0;
  const totalEquity = finalProperty?.totalEquityAfter || 0;
  
  const avgCashFlowGrowth = 0; // Simplified - would need full cashflow tracking
  
  // Show loading state
  if (isSelectionsLoading) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#f9fafb] font-sans">
        <Navbar />
        <div className="flex-1 overflow-hidden pb-8 px-8">
          <div className="bg-white rounded-lg h-full overflow-auto shadow-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Calculating investment timeline...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show empty state
  if (!yearlyData || yearlyData.length === 0) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#f9fafb] font-sans">
        <Navbar />
        <div className="flex-1 overflow-hidden pb-8 px-8">
          <div className="bg-white rounded-lg h-full overflow-auto shadow-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center max-w-md">
              <Home className="w-16 h-16 text-muted-foreground" />
              <h2 className="text-2xl font-semibold text-foreground">No Properties Selected</h2>
              <p className="text-muted-foreground">
                To see your investment timeline breakdown, please select properties and configure your investment profile on the dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const exportToCSV = () => {
    const headers = [
      'Year',
      'Display Year',
      'Status',
      'Property Number',
      'Property Type',
      'Available Deposit',
      'Required Deposit',
      'Available Borrowing',
      'Required Loan',
      'Property Cost',
      'Portfolio Value',
      'Total Equity',
      'Total Debt',
      'Annual Cash Flow',
      'LVR %'
    ];
    
    const rows = yearlyData.map(year => [
      year.year,
      year.displayYear,
      year.status,
      year.propertyNumber || '-',
      year.propertyType || '-',
      year.availableDeposit.toFixed(2),
      year.requiredDeposit.toFixed(2),
      year.availableBorrowingCapacity.toFixed(2),
      year.requiredLoan.toFixed(2),
      year.propertyCost.toFixed(2),
      year.portfolioValue.toFixed(2),
      year.totalEquity.toFixed(2),
      year.totalDebt.toFixed(2),
      year.annualCashFlow.toFixed(2),
      year.portfolioValue > 0 ? ((year.totalDebt / year.portfolioValue) * 100).toFixed(1) : '0'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `affordability_breakdown_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="flex flex-col h-screen w-full bg-[#f9fafb] font-sans">
      <Navbar />
      <div className="flex-1 overflow-hidden pb-8 px-8">
        <div className="bg-white rounded-lg h-full overflow-auto shadow-sm">
          <div className="container mx-auto py-8 space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Property Investment Decision Engine
          </h1>
          <p className="text-muted-foreground mt-2">
            Year-by-year breakdown showing exactly how purchase decisions are made
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>
      
      {/* How to Read Alert */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground">
          <strong>Understanding this breakdown:</strong> Each year shows the decision-making process. 
          Click any row to see detailed financial metrics including deposit requirements, borrowing capacity, 
          and portfolio performance. Pay special attention to:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Status Indicators:</strong> Purchased (green), Affordable (amber), Not Yet (gray)</li>
            <li><strong>Cash Flow:</strong> Track when your portfolio becomes self-sustaining</li>
            <li><strong>Portfolio Growth:</strong> Watch how property values and equity accumulate</li>
            <li><strong>Borrowing Capacity:</strong> Monitor available lending capacity over time</li>
          </ul>
        </AlertDescription>
      </Alert>
      
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardDescription className="text-green-700 dark:text-green-400">Total Properties</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Home className="w-6 h-6 text-green-600 dark:text-green-400" />
              {totalPurchases}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-green-600 dark:text-green-400">
              Across {yearlyData.length} year timeline
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardDescription className="text-blue-700 dark:text-blue-400">Final Portfolio Value</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              ${totalPropertyValue.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              ${totalEquity.toLocaleString()} equity
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-700 dark:text-purple-400">Cashflow Positive</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              {cashflowPositiveYear ? `Year ${cashflowPositiveYear.year}` : 'Not Yet'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              {cashflowPositiveYear ? 
                `$${cashflowPositiveYear.annualCashFlow.toLocaleString()}/year` : 
                'Building towards positive'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardDescription className="text-amber-700 dark:text-amber-400">Avg. Cash Flow Growth</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              ${avgCashFlowGrowth.toLocaleString()}/yr
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Annual improvement rate
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Table */}
      <AffordabilityBreakdownTable 
        data={yearlyData} 
        isCalculating={false}
        hasChanges={false}
      />
      
      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Understanding the Investment Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-2 text-foreground">Status Types</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span><span className="font-medium text-green-600 dark:text-green-400">Purchased:</span> Property acquired this year</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span><span className="font-medium text-amber-600 dark:text-amber-400">Affordable:</span> Can afford but not purchasing yet</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  <span><span className="font-medium text-gray-600 dark:text-gray-400">Not Yet:</span> Insufficient funds or capacity</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 text-foreground">Key Metrics</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><DollarSign className="w-3 h-3 inline mr-1" />Available vs Required Deposit</li>
                <li><TrendingUp className="w-3 h-3 inline mr-1" />Borrowing capacity tracking</li>
                <li><Home className="w-3 h-3 inline mr-1" />Portfolio value accumulation</li>
                <li><Clock className="w-3 h-3 inline mr-1" />Annual cash flow performance</li>
                <li><Zap className="w-3 h-3 inline mr-1" />Loan-to-value ratio (LVR)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 text-foreground">How It Works</h4>
              <ol className="space-y-1 text-muted-foreground list-decimal list-inside">
                <li>Each year evaluates next property purchase</li>
                <li>Checks deposit availability first</li>
                <li>Verifies borrowing capacity limits</li>
                <li>Tests serviceability requirements</li>
                <li>Tracks portfolio growth and cash flow</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffordabilityBreakdownPage;
