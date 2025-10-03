import React from 'react';
import { useAffordabilityBreakdown } from '../hooks/useAffordabilityBreakdown';
import AffordabilityBreakdownTable from '../components/AffordabilityBreakdownTable';
import { Navbar } from '../components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, Info, TrendingUp, 
  DollarSign, Home, Clock, Zap, Loader2
} from 'lucide-react';

export const AffordabilityBreakdownPage: React.FC = () => {
  const { data: yearlyData, isCalculating, hasChanges } = useAffordabilityBreakdown();
  
  // Calculate summary metrics
  const totalPurchases = yearlyData.filter(y => y.status === 'purchased').length;
  const finalYear = yearlyData[yearlyData.length - 1];
  const cashflowPositiveYear = yearlyData.find(y => y.annualCashFlow > 0);
  const totalPropertyValue = finalYear?.portfolioValue || 0;
  const totalEquity = finalYear?.totalEquity || 0;
  
  // Calculate average annual cash flow growth
  const avgCashFlowGrowth = yearlyData.length > 1
    ? ((finalYear?.annualCashFlow || 0) - (yearlyData[0]?.annualCashFlow || 0)) / yearlyData.length
    : 0;
  
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
          {isCalculating && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Calculating...</span>
            </div>
          )}
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex items-center gap-2"
            disabled={isCalculating}
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
        isCalculating={isCalculating}
        hasChanges={hasChanges}
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
