import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  ChevronDown, ChevronRight, TrendingUp, AlertCircle, 
  CheckCircle, XCircle, DollarSign, Home, PieChart, 
  Activity, Clock, RefreshCw
} from 'lucide-react';
import { YearBreakdownData } from '../hooks/useAffordabilityBreakdown';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Props {
  data: YearBreakdownData[];
  isCalculating?: boolean;
  hasChanges?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Memoized row component for performance
const YearRow = memo(({ 
  yearData, 
  isExpanded, 
  onToggle,
  isNew,
  hasChanged 
}: {
  yearData: YearBreakdownData;
  isExpanded: boolean;
  onToggle: () => void;
  isNew: boolean;
  hasChanged: boolean;
}) => {
  const getStatusIcon = () => {
    switch (yearData.status) {
      case 'purchased':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'affordable':
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (yearData.status) {
      case 'purchased':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Purchased</Badge>;
      case 'affordable':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Affordable</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Not Yet</Badge>;
    }
  };

  const depositProgress = yearData.requiredDeposit > 0 
    ? Math.min((yearData.availableDeposit / yearData.requiredDeposit) * 100, 100)
    : 0;

  return (
    <>
      <tr 
        className={`
          hover:bg-accent/50 cursor-pointer transition-all duration-300
          ${isNew ? 'animate-slide-in' : ''}
          ${hasChanged ? 'animate-pulse-once' : ''}
        `}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="font-medium text-foreground">Year {yearData.year}</span>
            <span className="text-sm text-muted-foreground">({yearData.displayYear})</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </td>
        <td className="px-4 py-3 text-foreground">
          {yearData.propertyNumber ? `#${yearData.propertyNumber}` : '-'}
        </td>
        <td className="px-4 py-3 text-foreground">
          {yearData.propertyType || '-'}
        </td>
        <td className="px-4 py-3 text-foreground font-medium">
          {formatCurrency(yearData.portfolioValue)}
        </td>
        <td className="px-4 py-3">
          <span className={yearData.annualCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(yearData.annualCashFlow)}
          </span>
        </td>
      </tr>
      
      {/* Expanded Details */}
      {isExpanded && (
        <tr className="bg-muted/50 animate-accordion-down">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Deposit Capacity */}
              <Card className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Deposit Capacity</h4>
                  </div>
                  {yearData.status === 'purchased' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-medium text-foreground">{formatCurrency(yearData.availableDeposit)}</span>
                  </div>
                  {yearData.requiredDeposit > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Required:</span>
                        <span className="font-medium text-foreground">{formatCurrency(yearData.requiredDeposit)}</span>
                      </div>
                      <Progress value={depositProgress} className="h-2" />
                      <span className="text-xs text-muted-foreground">
                        {depositProgress.toFixed(0)}% of required
                      </span>
                    </>
                  )}
                </div>
              </Card>

              {/* Borrowing Capacity */}
              <Card className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Borrowing Capacity</h4>
                  </div>
                  {yearData.status === 'purchased' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-medium text-foreground">{formatCurrency(yearData.availableBorrowingCapacity)}</span>
                  </div>
                  {yearData.requiredLoan > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Required:</span>
                      <span className="font-medium text-foreground">{formatCurrency(yearData.requiredLoan)}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Portfolio Metrics */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Portfolio Metrics</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Equity:</span>
                    <span className="font-medium text-foreground">{formatCurrency(yearData.totalEquity)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Debt:</span>
                    <span className="font-medium text-foreground">{formatCurrency(yearData.totalDebt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">LVR:</span>
                    <span className="font-medium text-foreground">
                      {yearData.portfolioValue > 0 
                        ? ((yearData.totalDebt / yearData.portfolioValue) * 100).toFixed(1) + '%'
                        : '0%'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Property Cost Breakdown (if purchased) */}
              {yearData.status === 'purchased' && yearData.propertyCost > 0 && (
                <Card className="p-4 lg:col-span-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Purchase Breakdown</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Property Cost</span>
                      <p className="text-sm font-medium text-foreground">{formatCurrency(yearData.propertyCost)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Deposit Paid</span>
                      <p className="text-sm font-medium text-foreground">{formatCurrency(yearData.requiredDeposit)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Loan Amount</span>
                      <p className="text-sm font-medium text-foreground">{formatCurrency(yearData.requiredLoan)}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if data actually changed
  return (
    prevProps.yearData.status === nextProps.yearData.status &&
    prevProps.yearData.propertyNumber === nextProps.yearData.propertyNumber &&
    prevProps.yearData.availableDeposit === nextProps.yearData.availableDeposit &&
    prevProps.yearData.portfolioValue === nextProps.yearData.portfolioValue &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isNew === nextProps.isNew &&
    prevProps.hasChanged === nextProps.hasChanged
  );
});

YearRow.displayName = 'YearRow';

export const AffordabilityBreakdownTable: React.FC<Props> = memo(({ 
  data, 
  isCalculating = false,
  hasChanges = false 
}) => {
  // Preserve expanded state across re-renders
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('affordability-expanded-years');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  // Track previous data for change detection
  const previousDataRef = useRef<YearBreakdownData[]>([]);
  const [changedYears, setChangedYears] = useState<Set<number>>(new Set());
  const [newYears, setNewYears] = useState<Set<number>>(new Set());
  
  // Detect changes when data updates
  useEffect(() => {
    if (hasChanges && previousDataRef.current.length > 0) {
      const changed = new Set<number>();
      const isNew = new Set<number>();
      
      data.forEach((yearData, index) => {
        const prevYear = previousDataRef.current[index];
        if (!prevYear) {
          isNew.add(yearData.year);
        } else if (
          prevYear.status !== yearData.status ||
          prevYear.propertyNumber !== yearData.propertyNumber
        ) {
          changed.add(yearData.year);
        }
      });
      
      setChangedYears(changed);
      setNewYears(isNew);
      
      // Clear highlights after animation
      setTimeout(() => {
        setChangedYears(new Set());
        setNewYears(new Set());
      }, 2000);
    }
    
    previousDataRef.current = [...data];
  }, [data, hasChanges]);
  
  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem(
      'affordability-expanded-years',
      JSON.stringify(Array.from(expandedYears))
    );
  }, [expandedYears]);
  
  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(year)) {
        newExpanded.delete(year);
      } else {
        newExpanded.add(year);
      }
      return newExpanded;
    });
  };
  
  // Loading overlay
  const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span>Recalculating timeline...</span>
      </div>
    </div>
  );

  // Summary stats
  const totalProperties = data.filter(y => y.status === 'purchased').length;
  const finalPortfolioValue = data[data.length - 1]?.portfolioValue || 0;
  const avgCashFlow = data.length > 0 
    ? data.reduce((sum, y) => sum + y.annualCashFlow, 0) / data.length 
    : 0;
  
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-muted-foreground">Total Properties</h4>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalProperties}</p>
          {hasChanges && (
            <Badge variant="secondary" className="mt-2 text-xs">
              Updated
            </Badge>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-muted-foreground">Final Portfolio Value</h4>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(finalPortfolioValue)}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-muted-foreground">Avg. Annual Cash Flow</h4>
          </div>
          <p className={`text-2xl font-bold ${avgCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(avgCashFlow)}
          </p>
        </Card>
      </div>
      
      {/* Main Table */}
      <div className="bg-card rounded-lg shadow-sm border overflow-hidden relative">
        {isCalculating && <LoadingOverlay />}
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b sticky top-0 z-5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Year
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Property #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Portfolio Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cash Flow
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-border">
              {data.map((yearData) => (
                <YearRow
                  key={yearData.year}
                  yearData={yearData}
                  isExpanded={expandedYears.has(yearData.year)}
                  onToggle={() => toggleYear(yearData.year)}
                  isNew={newYears.has(yearData.year)}
                  hasChanged={changedYears.has(yearData.year)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Change indicator */}
      {hasChanges && (
        <div className="text-center text-sm text-muted-foreground animate-fade-in flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Timeline updated based on your changes
        </div>
      )}
    </div>
  );
});

AffordabilityBreakdownTable.displayName = 'AffordabilityBreakdownTable';

export default AffordabilityBreakdownTable;
