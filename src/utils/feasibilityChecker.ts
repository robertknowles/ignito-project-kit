import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import type { PropertyType } from '../contexts/PropertySelectionContext';
import type { TimelineProperty } from '../types/property';

export interface FeasibilityAnalysis {
  isAchievable: boolean;
  severity: 'none' | 'minor' | 'moderate' | 'major';
  bottlenecks: {
    type: 'deposit' | 'borrowing' | 'timeline' | 'serviceability';
    message: string;
    shortfall: number;
  }[];
  suggestions: {
    action: string;
    impact: string;
    priority: 'high' | 'medium' | 'low';
    specificValue?: string; // e.g., "$120,000" or "12 years"
  }[];
  message: string;
}

interface SelectedProperty {
  id: string;
  cost: number;
  depositRequired: number;
  quantity: number;
}

export const analyzeFeasibility = (
  profile: InvestmentProfileData,
  selectedProperties: PropertyType[],
  propertySelections: Record<string, number>,
  timelineProperties: TimelineProperty[]
): FeasibilityAnalysis => {
  
  // Build selected properties list with quantities
  const selectedPropertiesList: SelectedProperty[] = selectedProperties
    .filter(p => propertySelections[p.id] > 0)
    .map(p => ({
      id: p.id,
      cost: p.cost,
      depositRequired: p.depositRequired,
      quantity: propertySelections[p.id]
    }));

  if (selectedPropertiesList.length === 0) {
    return {
      isAchievable: true,
      severity: 'none',
      bottlenecks: [],
      suggestions: [],
      message: '',
    };
  }

  const bottlenecks: FeasibilityAnalysis['bottlenecks'] = [];
  const suggestions: FeasibilityAnalysis['suggestions'] = [];
  
  // Calculate totals
  const totalProperties = selectedPropertiesList.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = selectedPropertiesList.reduce((sum, p) => sum + (p.cost * p.quantity), 0);
  const totalDepositNeeded = selectedPropertiesList.reduce((sum, p) => 
    sum + (p.depositRequired * p.quantity), 0
  );
  const totalLoanNeeded = selectedPropertiesList.reduce((sum, p) => 
    sum + ((p.cost - p.depositRequired) * p.quantity), 0
  );
  
  // Check 1: Deposit Sufficiency
  const depositShortfall = totalDepositNeeded - profile.depositPool;
  if (depositShortfall > 0) {
    bottlenecks.push({
      type: 'deposit',
      message: `Deposit shortfall: $${Math.round(depositShortfall / 1000)}k`,
      shortfall: depositShortfall,
    });
    
    const suggestedDeposit = Math.ceil((profile.depositPool + depositShortfall) / 5000) * 5000;
    suggestions.push({
      action: `Increase deposit pool to $${Math.round(suggestedDeposit / 1000)}k`,
      impact: `This would provide enough capital for your first ${Math.min(2, totalProperties)} ${totalProperties === 1 ? 'property' : 'properties'}`,
      priority: 'high',
      specificValue: `$${Math.round(suggestedDeposit / 1000)}k`,
    });
  }
  
  // Check 2: Borrowing Capacity
  const borrowingShortfall = totalLoanNeeded - profile.borrowingCapacity;
  if (borrowingShortfall > 0) {
    bottlenecks.push({
      type: 'borrowing',
      message: `Borrowing capacity shortfall: $${Math.round(borrowingShortfall / 1000)}k`,
      shortfall: borrowingShortfall,
    });
    
    const suggestedCapacity = Math.ceil((profile.borrowingCapacity + borrowingShortfall) / 10000) * 10000;
    suggestions.push({
      action: `Increase borrowing capacity to $${Math.round(suggestedCapacity / 1000)}k`,
      impact: 'This would allow you to finance all your target properties',
      priority: 'high',
      specificValue: `$${Math.round(suggestedCapacity / 1000)}k`,
    });
  }
  
  // Check 3: Timeline Feasibility (max 2 properties per year)
  const maxPropertiesInTimeline = profile.timelineYears * 2;
  if (totalProperties > maxPropertiesInTimeline) {
    const yearsNeeded = Math.ceil(totalProperties / 2);
    
    bottlenecks.push({
      type: 'timeline',
      message: `Timeline too short for ${totalProperties} properties (max ${maxPropertiesInTimeline} in ${profile.timelineYears} years)`,
      shortfall: totalProperties - maxPropertiesInTimeline,
    });
    
    suggestions.push({
      action: `Extend timeline to ${yearsNeeded} years`,
      impact: `Allows for ${totalProperties} properties at a sustainable pace (2 per year)`,
      priority: 'medium',
      specificValue: `${yearsNeeded} years`,
    });
  }
  
  // Check 4: Challenging Properties (properties that can't be afforded)
  const challengingCount = timelineProperties.filter(p => p.status === 'challenging').length;
  if (challengingCount > 0) {
    bottlenecks.push({
      type: 'serviceability',
      message: `${challengingCount} ${challengingCount === 1 ? 'property' : 'properties'} cannot be afforded with current settings`,
      shortfall: challengingCount,
    });
    
    const feasibleCount = totalProperties - challengingCount;
    if (feasibleCount > 0) {
      suggestions.push({
        action: `Start with ${feasibleCount} ${feasibleCount === 1 ? 'property' : 'properties'} instead of ${totalProperties}`,
        impact: `Build momentum with achievable targets, then reassess after year ${Math.ceil(profile.timelineYears / 2)}`,
        priority: 'high',
        specificValue: `${feasibleCount} properties`,
      });
    }
  }
  
  // Check 5: Reduce Property Count (if major shortfalls)
  if (depositShortfall > profile.depositPool * 0.5 || borrowingShortfall > profile.borrowingCapacity * 0.3) {
    const affordableProperties = Math.max(1, Math.floor(totalProperties * 0.6)); // Reduce by ~40%
    
    suggestions.push({
      action: `Consider starting with ${affordableProperties} ${affordableProperties === 1 ? 'property' : 'properties'} instead of ${totalProperties}`,
      impact: `Build momentum with achievable targets, then reassess after year ${Math.ceil(profile.timelineYears / 2)}`,
      priority: 'medium',
      specificValue: `${affordableProperties} properties`,
    });
  }
  
  // Check 6: Increase Annual Savings (if deposit is close but not quite enough)
  if (depositShortfall > 0 && depositShortfall < profile.depositPool * 0.3) {
    const yearsToSave = 2;
    const additionalSavingsNeeded = Math.ceil(depositShortfall / yearsToSave / 1000) * 1000;
    
    suggestions.push({
      action: `Increase annual savings by $${Math.round(additionalSavingsNeeded / 1000)}k`,
      impact: `Reach your deposit target in ${yearsToSave} years`,
      priority: 'low',
      specificValue: `$${Math.round(additionalSavingsNeeded / 1000)}k/year`,
    });
  }
  
  // Check 7: Increase Base Salary (if borrowing capacity is close)
  if (borrowingShortfall > 0 && borrowingShortfall < profile.borrowingCapacity * 0.2) {
    const additionalBorrowingNeeded = borrowingShortfall;
    const additionalSalaryNeeded = Math.ceil(additionalBorrowingNeeded / profile.salaryServiceabilityMultiplier / 1000) * 1000;
    
    suggestions.push({
      action: `Increase base salary to $${Math.round((profile.baseSalary + additionalSalaryNeeded) / 1000)}k`,
      impact: `Improves borrowing capacity by approximately $${Math.round(additionalBorrowingNeeded / 1000)}k`,
      priority: 'low',
      specificValue: `$${Math.round((profile.baseSalary + additionalSalaryNeeded) / 1000)}k`,
    });
  }
  
  // Determine severity
  let severity: 'none' | 'minor' | 'moderate' | 'major' = 'none';
  if (bottlenecks.length === 0) {
    severity = 'none';
  } else if (bottlenecks.length === 1 && bottlenecks[0].type === 'timeline') {
    severity = 'minor';
  } else if (depositShortfall > profile.depositPool || borrowingShortfall > profile.borrowingCapacity * 0.5 || challengingCount > totalProperties * 0.5) {
    severity = 'major';
  } else {
    severity = 'moderate';
  }
  
  // Generate message
  let message = '';
  if (severity === 'none') {
    message = 'Your goals look achievable! 🎉';
  } else if (severity === 'minor') {
    message = 'Your goals are close! Here\'s a small adjustment to consider:';
  } else if (severity === 'moderate') {
    message = 'Your goals are ambitious! Here are some adjustments that would help:';
  } else {
    message = 'Let\'s optimize your strategy to make these goals more achievable:';
  }
  
  return {
    isAchievable: severity === 'none',
    severity,
    bottlenecks,
    suggestions: suggestions.slice(0, 4), // Max 4 suggestions
    message,
  };
};

