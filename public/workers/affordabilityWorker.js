// Web Worker for affordability calculations
// This runs off the main thread to prevent UI freezes

let lastInputHash = '';
let lastResult = null;

// Helper: Create hash from inputs
function hashInputs(inputs) {
  return JSON.stringify(inputs);
}

// Helper: Calculate property growth
function calculatePropertyGrowth(initialValue, years, growthRate) {
  return initialValue * Math.pow(1 + growthRate, years);
}

// Helper: Calculate rental recognition rate
function calculateRentalRecognitionRate(portfolioSize) {
  if (portfolioSize <= 2) return 0.75;      // Properties 1-2: 75%
  if (portfolioSize <= 4) return 0.70;      // Properties 3-4: 70%
  return 0.65;                               // Properties 5+: 65%
}

// Main calculation function
function calculateTimeline(inputs) {
  const {
    selections,
    profile,
    globalFactors,
    propertyTypes,
    propertyDataMap,
    availableDeposit
  } = inputs;

  const growthRate = parseFloat(globalFactors.growthRate) / 100;
  const interestRate = parseFloat(globalFactors.interestRate) / 100;

  // Consolidation state
  let consolidationState = {
    consecutiveDebtTestFailures: 0
  };

  // Helper: Calculate available funds
  function calculateAvailableFunds(currentYear, previousPurchases, additionalEquity = 0) {
    let totalEnhancedSavings = 0;
    let totalCashflowReinvestment = 0;
    let totalDepositsUsed = 0;
    
    for (let year = 1; year <= currentYear; year++) {
      let yearSavings = profile.annualSavings;
      let netCashflow = 0;
      
      previousPurchases.forEach(purchase => {
        if (purchase.year < year) {
          const yearsOwned = year - purchase.year;
          const propertyData = propertyDataMap[purchase.title];
          
          if (propertyData) {
            const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
            const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
            const yieldRate = parseFloat(propertyData.yield) / 100;
            const portfolioSize = previousPurchases.filter(p => p.year < year).length;
            const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
            const rentalIncome = currentValue * yieldRate * recognitionRate;
            const loanInterest = purchase.loanAmount * interestRate;
            const expenses = rentalIncome * 0.30;
            const propertyCashflow = rentalIncome - loanInterest - expenses;
            netCashflow += propertyCashflow;
          }
        }
      });
      
      const totalYearSavings = yearSavings + netCashflow;
      totalEnhancedSavings += totalYearSavings;
      totalCashflowReinvestment += netCashflow;
    }
    
    previousPurchases.forEach(purchase => {
      if (purchase.year <= currentYear) {
        totalDepositsUsed += purchase.depositRequired;
      }
    });
    
    let availableCash = availableDeposit + (currentYear > 1 ? totalEnhancedSavings : 0) + additionalEquity;
    availableCash -= totalDepositsUsed;

    let existingPortfolioEquity = 0;
    let totalUsableEquity = 0;
    
    const firstPurchaseYear = previousPurchases.length > 0 
      ? Math.min(...previousPurchases.map(p => p.year))
      : currentYear;
    const yearsSinceFirstPurchase = currentYear - firstPurchaseYear;
    
    if (yearsSinceFirstPurchase > 0 && yearsSinceFirstPurchase % 3 === 0) {
      if (profile.portfolioValue > 0) {
        const grownPortfolioValue = calculatePropertyGrowth(profile.portfolioValue, currentYear - 1, growthRate);
        existingPortfolioEquity = Math.max(0, (grownPortfolioValue * 0.8 - profile.currentDebt) * profile.equityReleaseFactor);
      }

      totalUsableEquity = previousPurchases.reduce((acc, purchase) => {
        if (purchase.year <= currentYear) {
          const propertyCurrentValue = calculatePropertyGrowth(purchase.cost, currentYear - purchase.year, growthRate);
          const usableEquity = Math.max(0, (propertyCurrentValue * 0.8 - purchase.loanAmount) * profile.equityReleaseFactor);
          return acc + usableEquity;
        }
        return acc;
      }, existingPortfolioEquity);
    }
    
    const finalFunds = availableCash + totalUsableEquity;
    
    return {
      total: finalFunds,
      baseDeposit: Math.max(0, availableDeposit - totalDepositsUsed),
      cumulativeSavings: profile.annualSavings * (currentYear - 1),
      cashflowReinvestment: totalCashflowReinvestment,
      equityRelease: totalUsableEquity,
      depositsUsed: totalDepositsUsed
    };
  }

  // Helper: Calculate property score
  function calculatePropertyScore(purchase, currentYear) {
    const yearsOwned = currentYear - purchase.year;
    const propertyData = propertyDataMap[purchase.title];
    
    if (!propertyData) {
      return { cashflowScore: 0, equityScore: 0, totalScore: 0 };
    }
    
    const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
    const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
    const yieldRate = parseFloat(propertyData.yield) / 100;
    const rentalIncome = currentValue * yieldRate;
    const loanInterest = purchase.loanAmount * interestRate;
    const expenses = rentalIncome * 0.30;
    const netCashflow = rentalIncome - loanInterest - expenses;
    const currentEquity = currentValue - purchase.loanAmount;
    const weightedScore = 0.6 * netCashflow + 0.4 * currentEquity;
    
    return {
      cashflowScore: netCashflow,
      equityScore: currentEquity,
      totalScore: weightedScore
    };
  }

  // Helper: Execute consolidation
  function executeConsolidation(currentYear, previousPurchases) {
    if (previousPurchases.length === 0) {
      return {
        updatedPurchases: [],
        equityFreed: 0,
        debtReduced: 0,
        propertiesSold: 0,
      };
    }

    const rankedProperties = previousPurchases
      .filter(purchase => purchase.year <= currentYear)
      .map(purchase => ({
        ...purchase,
        score: calculatePropertyScore(purchase, currentYear)
      }))
      .sort((a, b) => a.score.totalScore - b.score.totalScore);
    
    let updatedPurchases = [...previousPurchases];
    let totalEquityFreed = 0;
    let totalDebtReduced = 0;
    let propertiesSold = 0;
    
    for (const property of rankedProperties) {
      const yearsOwned = currentYear - property.year;
      const propertyData = propertyDataMap[property.title];
      
      if (propertyData) {
        const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
        const currentValue = property.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
        const equity = currentValue - property.loanAmount;
        
        updatedPurchases = updatedPurchases.filter(p => 
          !(p.year === property.year && p.title === property.title && p.cost === property.cost)
        );
        
        totalEquityFreed += equity;
        totalDebtReduced += property.loanAmount;
        propertiesSold++;
        
        const remainingDebt = previousPurchases.reduce((sum, p) => {
          const stillOwned = updatedPurchases.some(up => 
            up.year === p.year && up.title === p.title && up.cost === p.cost
          );
          return stillOwned ? sum + p.loanAmount : sum;
        }, profile.currentDebt);
        
        const remainingValue = updatedPurchases.reduce((sum, p) => {
          const yearsOwned = currentYear - p.year;
          const propData = propertyDataMap[p.title];
          if (propData) {
            const growth = parseFloat(propData.growth) / 100;
            return sum + (p.cost * Math.pow(1 + growth, yearsOwned));
          }
          return sum;
        }, profile.portfolioValue);
        
        let netCashflow = 0;
        updatedPurchases.forEach(p => {
          const score = calculatePropertyScore(p, currentYear);
          netCashflow += score.cashflowScore;
        });
        
        const newLVR = remainingValue > 0 ? (remainingDebt / remainingValue) * 100 : 0;
        
        if (newLVR <= 80 && netCashflow >= 0 && propertiesSold >= 1) {
          break;
        }
      }
    }
    
    consolidationState.consecutiveDebtTestFailures = 0;
    
    return {
      updatedPurchases,
      equityFreed: totalEquityFreed,
      debtReduced: totalDebtReduced,
      propertiesSold
    };
  }

  // Helper: Check affordability
  function checkAffordability(property, availableFunds, previousPurchases, currentYear, additionalEquity = 0) {
    let netCashflow = 0;
    let grossRentalIncome = 0;
    let loanInterest = 0;
    let expenses = 0;
    
    previousPurchases.forEach(purchase => {
      if (purchase.year <= currentYear) {
        const yearsOwned = currentYear - purchase.year;
        const propertyData = propertyDataMap[purchase.title];
        
        if (propertyData) {
          const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
          const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
          const yieldRate = parseFloat(propertyData.yield) / 100;
          const portfolioSize = previousPurchases.filter(p => p.year <= currentYear).length;
          const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
          const rentalIncome = currentValue * yieldRate * recognitionRate;
          const propertyLoanInterest = purchase.loanAmount * interestRate;
          const propertyExpenses = rentalIncome * 0.30;
          
          grossRentalIncome += rentalIncome;
          loanInterest += propertyLoanInterest;
          expenses += propertyExpenses;
          netCashflow += (rentalIncome - propertyLoanInterest - propertyExpenses);
        }
      }
    });
    
    const newLoanAmount = property.cost - property.depositRequired;
    const depositBuffer = 40000;
    
    const dsr = grossRentalIncome > 0 ? (loanInterest / grossRentalIncome) * 100 : 999;
    const maxDSR = 80;
    
    const canAffordDeposit = (availableFunds - depositBuffer) >= property.depositRequired;
    const canAffordServiceability = dsr <= maxDSR;
    
    if (!canAffordDeposit) {
      return { canAfford: false };
    }
    
    if (canAffordServiceability) {
      consolidationState.consecutiveDebtTestFailures = 0;
      return { canAfford: true };
    }
    
    if (!canAffordServiceability) {
      consolidationState.consecutiveDebtTestFailures++;
    } else {
      consolidationState.consecutiveDebtTestFailures = 0;
    }
    
    const maxConsolidations = 3;
    const minConsolidationGap = 5;
    
    const yearsSinceLastConsolidation = currentYear - profile.lastConsolidationYear;
    const totalConsolidationsSoFar = 3 - profile.consolidationsRemaining;
    const consolidationEligible = yearsSinceLastConsolidation >= minConsolidationGap && totalConsolidationsSoFar < maxConsolidations;
    const shouldConsolidate = consolidationState.consecutiveDebtTestFailures >= 2 && consolidationEligible;
    
    if (shouldConsolidate && previousPurchases.length > 0) {
      const consolidationResult = executeConsolidation(currentYear, previousPurchases);
      const newAvailableFundsResult = calculateAvailableFunds(currentYear, consolidationResult.updatedPurchases, consolidationResult.equityFreed);
      const recheck = checkAffordability(property, newAvailableFundsResult.total, consolidationResult.updatedPurchases, currentYear, consolidationResult.equityFreed);
      
      return { 
        canAfford: recheck.canAfford, 
        consolidationTriggered: true, 
        consolidationDetails: consolidationResult 
      };
    }
    
    return { canAfford: false };
  }

  // Helper: Determine next purchase year
  function determineNextPurchaseYear(property, previousPurchases) {
    let currentPurchases = [...previousPurchases];
    
    for (let year = 1; year <= profile.timelineYears; year++) {
      const lastPurchaseYear = currentPurchases.length > 0 
        ? Math.max(...currentPurchases.map(p => p.year)) 
        : 0;
      
      if (lastPurchaseYear > 0 && year <= lastPurchaseYear + 1) {
        continue;
      }
      
      const availableFundsResult = calculateAvailableFunds(year, currentPurchases);
      const affordabilityResult = checkAffordability(property, availableFundsResult.total, currentPurchases, year);
      
      if (affordabilityResult.canAfford) {
        const absoluteYear = year + 2025 - 1;
        
        if (affordabilityResult.consolidationTriggered) {
          currentPurchases = affordabilityResult.consolidationDetails.updatedPurchases;
          
          const newPurchase = {
            year: year,
            cost: property.cost,
            depositRequired: property.depositRequired,
            loanAmount: property.cost - property.depositRequired,
            title: property.title
          };
          currentPurchases.push(newPurchase);
          
          return { 
            year: absoluteYear, 
            consolidation: affordabilityResult.consolidationDetails,
            updatedPurchases: currentPurchases
          };
        }
        
        return { year: absoluteYear };
      }
    }
    
    return { year: Infinity };
  }

  // Main calculation logic
  const allPropertiesToPurchase = [];
  
  Object.entries(selections).forEach(([propertyId, quantity]) => {
    if (quantity > 0) {
      const property = propertyTypes.find(p => p.id === propertyId);
      if (property) {
        for (let i = 0; i < quantity; i++) {
          allPropertiesToPurchase.push({ property, index: i });
        }
      }
    }
  });

  const timelineProperties = [];
  let purchaseHistory = [];
  
  allPropertiesToPurchase.forEach(({ property, index }) => {
    const result = determineNextPurchaseYear(property, purchaseHistory);
    const loanAmount = property.cost - property.depositRequired;
    
    let portfolioValueAfter = 0;
    let totalEquityAfter = 0;
    let availableFundsUsed = 0;
    let totalDebtAfter = 0;
    
    if (result.year !== Infinity) {
      const purchaseYear = result.year - 2025 + 1;
      
      if (profile.portfolioValue > 0) {
        portfolioValueAfter += calculatePropertyGrowth(profile.portfolioValue, purchaseYear - 1, growthRate);
      }
      
      totalDebtAfter = profile.currentDebt;
      
      purchaseHistory.forEach(purchase => {
        const yearsOwned = purchaseYear - purchase.year;
        portfolioValueAfter += calculatePropertyGrowth(purchase.cost, yearsOwned, growthRate);
        totalDebtAfter += purchase.loanAmount;
      });
      
      portfolioValueAfter += property.cost;
      totalDebtAfter += loanAmount;
      totalEquityAfter = portfolioValueAfter - totalDebtAfter;
      
      const availableFundsResult = calculateAvailableFunds(purchaseYear, purchaseHistory);
      availableFundsUsed = availableFundsResult.total;
    }
    
    const purchaseYear = result.year - 2025 + 1;
    let grossRentalIncome = 0;
    let loanInterestCalc = 0;
    let expenses = 0;
    let netCashflow = 0;
    
    const portfolioSize = purchaseHistory.filter(p => p.year <= purchaseYear).length + 1;
    const rentalRecognitionRate = calculateRentalRecognitionRate(portfolioSize);
    
    [...purchaseHistory, { year: purchaseYear, cost: property.cost, depositRequired: property.depositRequired, loanAmount: loanAmount, title: property.title }].forEach(purchase => {
      const yearsOwned = purchaseYear - purchase.year;
      const propertyData = propertyDataMap[purchase.title];
      
      if (propertyData && purchase.year <= purchaseYear) {
        const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
        const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
        const yieldRate = parseFloat(propertyData.yield) / 100;
        const rentalIncome = currentValue * yieldRate * rentalRecognitionRate;
        const propertyLoanInterest = purchase.loanAmount * interestRate;
        const propertyExpenses = rentalIncome * 0.30;
        
        grossRentalIncome += rentalIncome;
        loanInterestCalc += propertyLoanInterest;
        expenses += propertyExpenses;
      }
    });
    
    netCashflow = grossRentalIncome - loanInterestCalc - expenses;
    
    const depositBuffer = 40000;
    const depositTestSurplus = availableFundsUsed - depositBuffer - property.depositRequired;
    const depositTestPass = depositTestSurplus >= 0;
    
    const dsr = grossRentalIncome > 0 ? (loanInterestCalc / grossRentalIncome) * 100 : 999;
    const maxDSR = 80;
    const serviceabilityTestSurplus = (grossRentalIncome * (maxDSR / 100)) - loanInterestCalc;
    const serviceabilityTestPass = dsr <= maxDSR;
    
    const fundsBreakdown = calculateAvailableFunds(purchaseYear, purchaseHistory);
    const baseDeposit = fundsBreakdown.baseDeposit;
    const cumulativeSavings = fundsBreakdown.cumulativeSavings;
    const cashflowReinvestment = fundsBreakdown.cashflowReinvestment;
    const equityRelease = fundsBreakdown.equityRelease;
    
    const timelineProperty = {
      id: `${property.id}_${index}`,
      title: property.title,
      cost: property.cost,
      depositRequired: property.depositRequired,
      loanAmount: loanAmount,
      affordableYear: result.year,
      status: result.year === Infinity ? 'challenging' : (result.consolidation ? 'consolidation' : 'feasible'),
      isConsolidationEvent: !!result.consolidation,
      propertyIndex: index,
      portfolioValueAfter: portfolioValueAfter,
      totalEquityAfter: totalEquityAfter,
      totalDebtAfter: totalDebtAfter,
      availableFundsUsed: availableFundsUsed,
      grossRentalIncome,
      loanInterest: loanInterestCalc,
      expenses,
      netCashflow,
      depositTestSurplus,
      depositTestPass,
      serviceabilityTestSurplus,
      serviceabilityTestPass,
      borrowingCapacityUsed: loanAmount,
      borrowingCapacityRemaining: profile.borrowingCapacity - totalDebtAfter,
      isGapRuleBlocked: false,
      rentalRecognitionRate,
      portfolioValueBefore: portfolioValueAfter - property.cost,
      totalEquityBefore: totalEquityAfter - (property.cost - loanAmount),
      totalDebtBefore: totalDebtAfter - loanAmount,
      baseDeposit,
      cumulativeSavings,
      cashflowReinvestment,
      equityRelease
    };
    
    if (result.consolidation) {
      timelineProperty.isConsolidationPhase = true;
      timelineProperty.consolidationDetails = {
        propertiesSold: result.consolidation.propertiesSold,
        equityFreed: result.consolidation.equityFreed,
        debtReduced: result.consolidation.debtReduced
      };
    }
    
    timelineProperties.push(timelineProperty);
    
    if (result.year !== Infinity) {
      if (result.consolidation && result.updatedPurchases) {
        purchaseHistory = [...result.updatedPurchases];
      } else {
        purchaseHistory.push({
          year: result.year - 2025 + 1,
          cost: property.cost,
          depositRequired: property.depositRequired,
          loanAmount: loanAmount,
          title: property.title
        });
      }
      
      purchaseHistory.sort((a, b) => a.year - b.year);
    }
  });
  
  // Generate complete timeline
  const completeTimeline = [];
  const purchaseMap = new Map();
  
  timelineProperties.forEach(prop => {
    purchaseMap.set(prop.affordableYear, prop);
  });
  
  for (let relativeYear = 1; relativeYear <= profile.timelineYears; relativeYear++) {
    const absoluteYear = relativeYear + 2024;
    
    if (purchaseMap.has(absoluteYear)) {
      completeTimeline.push(purchaseMap.get(absoluteYear));
      continue;
    }
    
    const purchasesUpToThisYear = purchaseHistory.filter(p => p.year < relativeYear);
    
    let portfolioValue = profile.portfolioValue > 0 
      ? calculatePropertyGrowth(profile.portfolioValue, relativeYear - 1, growthRate)
      : 0;
      
    let totalDebt = profile.currentDebt;
    let grossRentalIncome = 0;
    let loanInterestCalc = 0;
    let expenses = 0;
    
    purchasesUpToThisYear.forEach(purchase => {
      const yearsOwned = relativeYear - purchase.year;
      const propertyData = propertyDataMap[purchase.title];
      
      if (propertyData) {
        const propertyGrowthRate = parseFloat(propertyData.growth) / 100;
        const currentValue = purchase.cost * Math.pow(1 + propertyGrowthRate, yearsOwned);
        portfolioValue += currentValue;
        totalDebt += purchase.loanAmount;
        
        const yieldRate = parseFloat(propertyData.yield) / 100;
        const portfolioSize = purchasesUpToThisYear.length;
        const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
        const rentalIncome = currentValue * yieldRate * recognitionRate;
        const propertyLoanInterest = purchase.loanAmount * interestRate;
        const propertyExpenses = rentalIncome * 0.30;
        
        grossRentalIncome += rentalIncome;
        loanInterestCalc += propertyLoanInterest;
        expenses += propertyExpenses;
      }
    });
    
    const netCashflow = grossRentalIncome - loanInterestCalc - expenses;
    const totalEquity = portfolioValue - totalDebt;
    const fundsBreakdown = calculateAvailableFunds(relativeYear, purchasesUpToThisYear);
    
    const nonPurchaseYear = {
      id: `year_${absoluteYear}`,
      title: 'No Purchase',
      cost: 0,
      depositRequired: 0,
      loanAmount: 0,
      affordableYear: absoluteYear,
      status: 'hold',
      isConsolidationEvent: false,
      propertyIndex: 0,
      portfolioValueAfter: portfolioValue,
      totalEquityAfter: totalEquity,
      totalDebtAfter: totalDebt,
      availableFundsUsed: fundsBreakdown.total,
      grossRentalIncome,
      loanInterest: loanInterestCalc,
      expenses,
      netCashflow,
      depositTestSurplus: 0,
      depositTestPass: true,
      serviceabilityTestSurplus: 0,
      serviceabilityTestPass: true,
      borrowingCapacityUsed: 0,
      borrowingCapacityRemaining: profile.borrowingCapacity - totalDebt,
      isGapRuleBlocked: false,
      rentalRecognitionRate: 0,
      portfolioValueBefore: portfolioValue,
      totalEquityBefore: totalEquity,
      totalDebtBefore: totalDebt,
      baseDeposit: fundsBreakdown.baseDeposit,
      cumulativeSavings: fundsBreakdown.cumulativeSavings,
      cashflowReinvestment: fundsBreakdown.cashflowReinvestment,
      equityRelease: fundsBreakdown.equityRelease
    };
    
    completeTimeline.push(nonPurchaseYear);
  }
  
  return completeTimeline;
}

// Message handler
self.addEventListener('message', (e) => {
  const { type, payload } = e.data;
  
  if (type === 'CALCULATE') {
    const inputHash = hashInputs(payload);
    
    // Return cached result if inputs haven't changed
    if (inputHash === lastInputHash && lastResult !== null) {
      self.postMessage({ 
        type: 'RESULT', 
        payload: lastResult,
        cached: true
      });
      return;
    }
    
    // Perform fresh calculation
    try {
      const result = calculateTimeline(payload);
      
      // Cache the result
      lastInputHash = inputHash;
      lastResult = result;
      
      self.postMessage({ 
        type: 'RESULT', 
        payload: result,
        cached: false
      });
    } catch (error) {
      self.postMessage({ 
        type: 'ERROR', 
        error: error.message 
      });
    }
  }
});
