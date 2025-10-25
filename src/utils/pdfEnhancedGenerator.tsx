import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { TimelineProperty, GrowthProjection } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import type { PropertyAssumption, GlobalEconomicFactors } from '../contexts/DataAssumptionsContext';

// ========================================
// TYPES & INTERFACES
// ========================================

interface MilestoneData {
  equityRelease?: {
    year: number;
    displayPeriod: string;
    message: string;
  };
  cashflowPositive?: {
    year: number;
    displayPeriod: string;
    message: string;
  };
  consolidation?: {
    year: number;
    displayPeriod: string;
    message: string;
  };
}

interface GoalAchievement {
  equityGoalYear?: number;
  passiveIncomeGoalYear?: number;
  bothAchieved: boolean;
}

interface PropertyRole {
  type: string;
  avgCost: number;
  yield: number;
  growth: number;
  role: string;
}

interface AgentBranding {
  name: string;
  email: string;
  website: string;
  phone?: string;
}

interface PDFGenerationOptions {
  clientName: string;
  profile: InvestmentProfileData;
  timelineProperties: TimelineProperty[];
  projections: GrowthProjection[];
  propertyAssumptions: PropertyAssumption[];
  globalFactors: GlobalEconomicFactors;
  agentBranding?: AgentBranding;
  onProgress?: (stage: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

// ========================================
// MILESTONE DETECTION FUNCTIONS
// ========================================

/**
 * Detect when equity release enables next purchase
 */
const detectEquityReleaseMilestone = (
  projections: GrowthProjection[],
  timelineProperties: TimelineProperty[]
): MilestoneData['equityRelease'] | undefined => {
  if (projections.length < 2 || timelineProperties.length < 2) return undefined;

  // Find first year where equity > 20% of next property price
  for (let i = 1; i < projections.length - 1; i++) {
    const projection = projections[i];
    const nextProperty = timelineProperties.find(p => p.affordableYear > projection.year);
    
    if (nextProperty && projection.totalEquity > nextProperty.cost * 0.2) {
      return {
        year: projection.year,
        displayPeriod: timelineProperties[i]?.displayPeriod || `Year ${Math.round(projection.year)}`,
        message: `Equity release enables next purchase`
      };
    }
  }
  
  return undefined;
};

/**
 * Detect when portfolio turns cash-flow positive
 */
const detectCashflowPositiveMilestone = (
  timelineProperties: TimelineProperty[]
): MilestoneData['cashflowPositive'] | undefined => {
  // Find first property where cumulative net cashflow turns positive
  let cumulativeCashflow = 0;
  
  for (const property of timelineProperties) {
    cumulativeCashflow += property.netCashflow;
    
    if (cumulativeCashflow > 0) {
      return {
        year: property.affordableYear,
        displayPeriod: property.displayPeriod,
        message: `Portfolio turns cash-flow positive`
      };
    }
  }
  
  return undefined;
};

/**
 * Detect consolidation phase (80% through timeline for long timelines)
 */
const detectConsolidationMilestone = (
  profile: InvestmentProfileData,
  timelineProperties: TimelineProperty[]
): MilestoneData['consolidation'] | undefined => {
  if (profile.timelineYears <= 10 || timelineProperties.length < 3) return undefined;

  const consolidationYear = Math.floor(profile.timelineYears * 0.8);
  const consolidationProperty = timelineProperties.find(
    p => Math.round(p.affordableYear) >= consolidationYear
  );

  if (consolidationProperty) {
    return {
      year: consolidationProperty.affordableYear,
      displayPeriod: consolidationProperty.displayPeriod,
      message: `Consolidation phase begins`
    };
  }

  return undefined;
};

/**
 * Detect all milestones
 */
const detectMilestones = (
  profile: InvestmentProfileData,
  timelineProperties: TimelineProperty[],
  projections: GrowthProjection[]
): MilestoneData => {
  return {
    equityRelease: detectEquityReleaseMilestone(projections, timelineProperties),
    cashflowPositive: detectCashflowPositiveMilestone(timelineProperties),
    consolidation: detectConsolidationMilestone(profile, timelineProperties)
  };
};

// ========================================
// GOAL ACHIEVEMENT DETECTION
// ========================================

/**
 * Detect when goals are achieved
 */
const detectGoalAchievement = (
  profile: InvestmentProfileData,
  projections: GrowthProjection[]
): GoalAchievement => {
  let equityGoalYear: number | undefined;
  let passiveIncomeGoalYear: number | undefined;

  for (const projection of projections) {
    if (!equityGoalYear && projection.totalEquity >= profile.equityGoal) {
      equityGoalYear = projection.year;
    }
    if (!passiveIncomeGoalYear && projection.annualIncome >= profile.cashflowGoal) {
      passiveIncomeGoalYear = projection.year;
    }
    if (equityGoalYear && passiveIncomeGoalYear) break;
  }

  return {
    equityGoalYear,
    passiveIncomeGoalYear,
    bothAchieved: !!equityGoalYear && !!passiveIncomeGoalYear
  };
};

// ========================================
// PROPERTY ROLE CLASSIFICATION
// ========================================

/**
 * Classify property role based on yield and growth
 */
const classifyPropertyRole = (yieldPercent: number, growthPercent: number, cost: number): string => {
  if (yieldPercent > 7 && growthPercent < 5) {
    return 'Yield booster';
  } else if (yieldPercent < 6 && growthPercent > 6) {
    return 'Growth driver';
  } else if (cost > 1000000) {
    return 'Long-term anchor';
  } else if (cost < 300000) {
    return 'Entry-level, lower risk';
  } else {
    return 'Balanced performer';
  }
};

/**
 * Generate property roles table data
 */
const generatePropertyRoles = (propertyAssumptions: PropertyAssumption[]): PropertyRole[] => {
  return propertyAssumptions.map(prop => ({
    type: prop.type,
    avgCost: parseFloat(prop.averageCost),
    yield: parseFloat(prop.yield),
    growth: parseFloat(prop.growth),
    role: classifyPropertyRole(
      parseFloat(prop.yield),
      parseFloat(prop.growth),
      parseFloat(prop.averageCost)
    )
  }));
};

// ========================================
// NARRATIVE GENERATION
// ========================================

/**
 * Generate plain language strategy summary
 */
const generateStrategySummary = (
  timelineProperties: TimelineProperty[],
  profile: InvestmentProfileData
): string => {
  if (timelineProperties.length === 0) {
    return 'Your investment strategy is being developed. Add properties to see your personalized strategy summary.';
  }

  const firstProperty = timelineProperties[0];
  const propertyTypes = [...new Set(timelineProperties.map(p => p.title))];
  const subsequentTypes = propertyTypes.slice(1).join(', ') || 'additional properties';

  const summary = `We begin with a ${firstProperty.title} purchase to build a foundation. As equity grows, it's recycled into ${subsequentTypes} that compound over time. By Year ${profile.timelineYears}, your portfolio becomes self-funding — meeting both equity and cash flow goals.`;

  return summary;
};

/**
 * Format currency for display
 */
const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  } else {
    return `$${amount.toFixed(0)}`;
  }
};

/**
 * Format percentage for display
 */
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// ========================================
// PDF PAGE GENERATION FUNCTIONS
// ========================================

/**
 * Add header to PDF page
 */
const addPageHeader = (
  pdf: jsPDF,
  clientName: string,
  pageTitle: string,
  margin: number
): number => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Agent Logo Placeholder
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, margin, 30, 10, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('[Logo]', margin + 15, margin + 6.5, { align: 'center' });
  
  // Report Title
  pdf.setFontSize(16);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Investment Strategy Report', margin + 35, margin + 7);
  
  // Client Name
  pdf.setFontSize(10);
  pdf.setTextColor(59, 130, 246);
  pdf.text(`Prepared for: ${clientName}`, margin, margin + 17);
  
  // Date
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, margin + 17, { align: 'right' });
  
  // Separator line
  pdf.setDrawColor(243, 244, 246);
  pdf.line(margin, margin + 22, pageWidth - margin, margin + 22);
  
  // Page title
  pdf.setFontSize(14);
  pdf.setTextColor(17, 24, 39);
  pdf.text(pageTitle, margin, margin + 30);
  
  return margin + 35; // Return Y position after header
};

/**
 * Add footer to PDF page
 */
const addPageFooter = (
  pdf: jsPDF,
  pageNumber: number,
  totalPages: number,
  agentBranding?: AgentBranding,
  margin: number = 15
): void => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Agent branding
  if (agentBranding) {
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    
    const brandingY = pageHeight - 18;
    const phone = agentBranding.phone ? ` | 📞 ${agentBranding.phone}` : '';
    const brandingText = `${agentBranding.name}${phone} | ✉️ ${agentBranding.email} | 🌐 ${agentBranding.website}`;
    
    pdf.text(brandingText, pageWidth / 2, brandingY, { align: 'center' });
    
    // Disclaimer
    pdf.setFontSize(7);
    pdf.setTextColor(156, 163, 175);
    pdf.text('Projections are indicative only and not financial advice.', pageWidth / 2, brandingY + 4, { align: 'center' });
  }
  
  // Page number
  pdf.setFontSize(8);
  pdf.setTextColor(156, 163, 175);
  pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
};

/**
 * Generate Page 1: Overview & Strategy
 */
const generatePage1 = async (
  pdf: jsPDF,
  options: PDFGenerationOptions,
  milestones: MilestoneData
): Promise<void> => {
  const { clientName, profile, timelineProperties } = options;
  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  let currentY = addPageHeader(pdf, clientName, 'Overview & Strategy', margin);
  
  // 1. Client Snapshot Table
  currentY += 5;
  pdf.setFontSize(11);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Client Snapshot', margin, currentY);
  currentY += 7;
  
  const snapshotData = [
    ['Starting Savings', formatCurrency(profile.depositPool)],
    ['Annual Savings', formatCurrency(profile.annualSavings)],
    ['Borrowing Capacity', formatCurrency(profile.borrowingCapacity)],
    ['Risk Profile', 'Moderate'], // Could be made dynamic
    ['Time Horizon', `${profile.timelineYears} Years`]
  ];
  
  pdf.setFontSize(9);
  snapshotData.forEach(([label, value]) => {
    pdf.setTextColor(107, 114, 128);
    pdf.text(label, margin + 5, currentY);
    pdf.setTextColor(17, 24, 39);
    pdf.text(value, margin + 70, currentY);
    currentY += 6;
  });
  
  // 2. Goals Section
  currentY += 5;
  pdf.setFontSize(11);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Investment Goals', margin, currentY);
  currentY += 7;
  
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text('🎯 Equity Goal:', margin + 5, currentY);
  pdf.setTextColor(17, 24, 39);
  pdf.text(formatCurrency(profile.equityGoal), margin + 35, currentY);
  currentY += 6;
  
  pdf.setTextColor(107, 114, 128);
  pdf.text('💰 Passive Income Goal:', margin + 5, currentY);
  pdf.setTextColor(17, 24, 39);
  pdf.text(`${formatCurrency(profile.cashflowGoal)}/year`, margin + 50, currentY);
  currentY += 6;
  
  pdf.setTextColor(107, 114, 128);
  pdf.text('🏆 Target Year:', margin + 5, currentY);
  pdf.setTextColor(17, 24, 39);
  pdf.text(`${2025 + profile.timelineYears}`, margin + 35, currentY);
  currentY += 10;
  
  // 3. Plain Language Summary
  pdf.setFontSize(11);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Strategy Summary', margin, currentY);
  currentY += 7;
  
  const summary = generateStrategySummary(timelineProperties, profile);
  pdf.setFontSize(9);
  pdf.setTextColor(55, 65, 81);
  const summaryLines = pdf.splitTextToSize(summary, pageWidth - margin * 2);
  pdf.text(summaryLines, margin, currentY);
  currentY += summaryLines.length * 5 + 10;
  
  // 4. Property Timeline Visual
  if (timelineProperties.length > 0) {
    pdf.setFontSize(11);
    pdf.setTextColor(17, 24, 39);
    pdf.text('Property Timeline', margin, currentY);
    currentY += 7;
    
    const displayProperties = timelineProperties.slice(0, 5);
    const colWidth = (pageWidth - margin * 2) / displayProperties.length;
    
    displayProperties.forEach((property, index) => {
      const colX = margin + index * colWidth;
      
      // Property icon
      pdf.setFontSize(16);
      pdf.text('🏠', colX + colWidth / 2 - 3, currentY);
      
      // Year
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text(property.displayPeriod, colX + colWidth / 2, currentY + 7, { align: 'center' });
      
      // Property type
      pdf.setFontSize(7);
      const typeText = property.title.length > 15 ? property.title.substring(0, 12) + '...' : property.title;
      pdf.text(typeText, colX + colWidth / 2, currentY + 12, { align: 'center' });
      
      // Price
      pdf.setTextColor(59, 130, 246);
      pdf.text(formatCurrency(property.cost), colX + colWidth / 2, currentY + 17, { align: 'center' });
      
      // Arrow
      if (index < displayProperties.length - 1) {
        pdf.setTextColor(200, 200, 200);
        pdf.text('→', colX + colWidth - 3, currentY + 8);
      }
    });
    
    currentY += 25;
  }
  
  // 5. Milestone Callouts
  const milestonesList = [
    milestones.equityRelease,
    milestones.cashflowPositive,
    milestones.consolidation
  ].filter(Boolean);
  
  if (milestonesList.length > 0) {
    pdf.setFontSize(11);
    pdf.setTextColor(17, 24, 39);
    pdf.text('Key Milestones', margin, currentY);
    currentY += 7;
    
    milestonesList.forEach((milestone) => {
      if (milestone) {
        pdf.setFontSize(9);
        pdf.setTextColor(59, 130, 246);
        pdf.text(`${milestone.displayPeriod}`, margin + 5, currentY);
        pdf.setTextColor(55, 65, 81);
        pdf.text(`→ ${milestone.message}`, margin + 25, currentY);
        currentY += 6;
      }
    });
  }
};

/**
 * Add goal achievement banner to timeline page
 */
const addGoalBanner = (
  pdf: jsPDF,
  goalAchievement: GoalAchievement,
  profile: InvestmentProfileData,
  currentY: number,
  margin: number
): number => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  if (!goalAchievement.equityGoalYear && !goalAchievement.passiveIncomeGoalYear) {
    return currentY;
  }
  
  // Draw banner box
  pdf.setDrawColor(59, 130, 246);
  pdf.setLineWidth(0.5);
  pdf.rect(margin, currentY, pageWidth - margin * 2, 20);
  
  currentY += 6;
  
  pdf.setFontSize(10);
  pdf.setTextColor(59, 130, 246);
  
  if (goalAchievement.bothAchieved) {
    const year = Math.max(goalAchievement.equityGoalYear!, goalAchievement.passiveIncomeGoalYear!);
    pdf.text('✅ All goals achieved by year ' + Math.round(year), margin + 5, currentY);
    currentY += 6;
    pdf.setFontSize(8);
    pdf.setTextColor(55, 65, 81);
    pdf.text(`• Equity: ${formatCurrency(profile.equityGoal)}`, margin + 10, currentY);
    currentY += 5;
    pdf.text(`• Passive Income: ${formatCurrency(profile.cashflowGoal)}/year`, margin + 10, currentY);
  } else if (goalAchievement.equityGoalYear) {
    pdf.text(`🎯 Equity goal of ${formatCurrency(profile.equityGoal)} reached by year ${Math.round(goalAchievement.equityGoalYear)}`, margin + 5, currentY);
  } else if (goalAchievement.passiveIncomeGoalYear) {
    pdf.text(`💰 Passive income goal of ${formatCurrency(profile.cashflowGoal)}/year reached by year ${Math.round(goalAchievement.passiveIncomeGoalYear)}`, margin + 5, currentY);
  }
  
  return currentY + 10;
};

/**
 * Generate Page 4: Assumptions & Details
 */
const generatePage4 = (
  pdf: jsPDF,
  options: PDFGenerationOptions
): void => {
  const { clientName, profile, propertyAssumptions, globalFactors } = options;
  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  pdf.addPage();
  let currentY = addPageHeader(pdf, clientName, 'Assumptions & Details', margin);
  
  // 1. Model Inputs & Key Assumptions Table
  currentY += 5;
  pdf.setFontSize(11);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Model Inputs & Key Assumptions', margin, currentY);
  currentY += 7;
  
  const assumptionsData = [
    ['Interest Rate', `${globalFactors.interestRate}%`, 'Reflects current lending conditions'],
    ['LVR (Loan to Value)', `${globalFactors.loanToValueRatio}%`, 'Standard lending ratio'],
    ['Growth Rate (Y1)', `${profile.growthCurve.year1}%`, 'First year property growth'],
    ['Growth Rate (Y2-3)', `${profile.growthCurve.years2to3}%`, 'Years 2-3 property growth'],
    ['Growth Rate (Y4)', `${profile.growthCurve.year4}%`, 'Year 4 property growth'],
    ['Growth Rate (Y5+)', `${profile.growthCurve.year5plus}%`, 'Year 5+ property growth'],
    ['Expense Ratio', '30%', 'Maintenance, insurance, rates'],
    ['Inflation', '3%', 'Annual cost inflation']
  ];
  
  pdf.setFontSize(7);
  
  // Table headers
  pdf.setFillColor(243, 244, 246);
  pdf.rect(margin, currentY - 4, pageWidth - margin * 2, 6, 'F');
  pdf.setTextColor(17, 24, 39);
  pdf.text('Variable', margin + 2, currentY);
  pdf.text('Value', margin + 60, currentY);
  pdf.text('Rationale', margin + 85, currentY);
  currentY += 5;
  
  // Table rows
  pdf.setFontSize(7);
  assumptionsData.forEach(([variable, value, rationale]) => {
    pdf.setTextColor(55, 65, 81);
    pdf.text(variable, margin + 2, currentY);
    pdf.setTextColor(17, 24, 39);
    pdf.text(value, margin + 60, currentY);
    pdf.setTextColor(107, 114, 128);
    pdf.text(rationale, margin + 85, currentY);
    currentY += 5;
  });
  
  // 2. Property Type Roles Table
  currentY += 10;
  pdf.setFontSize(11);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Property Type Roles', margin, currentY);
  currentY += 7;
  
  const propertyRoles = generatePropertyRoles(propertyAssumptions);
  
  // Table headers
  pdf.setFillColor(243, 244, 246);
  pdf.rect(margin, currentY - 4, pageWidth - margin * 2, 6, 'F');
  pdf.setFontSize(7);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Type', margin + 2, currentY);
  pdf.text('Price', margin + 55, currentY);
  pdf.text('Yield', margin + 75, currentY);
  pdf.text('Growth', margin + 90, currentY);
  pdf.text('Role', margin + 110, currentY);
  currentY += 5;
  
  // Table rows (limit to fit on page)
  pdf.setFontSize(7);
  propertyRoles.slice(0, 15).forEach((role) => {
    pdf.setTextColor(55, 65, 81);
    const typeText = role.type.length > 20 ? role.type.substring(0, 17) + '...' : role.type;
    pdf.text(typeText, margin + 2, currentY);
    pdf.setTextColor(17, 24, 39);
    pdf.text(formatCurrency(role.avgCost), margin + 55, currentY);
    pdf.text(formatPercent(role.yield), margin + 75, currentY);
    pdf.text(formatPercent(role.growth), margin + 90, currentY);
    pdf.setTextColor(59, 130, 246);
    pdf.text(role.role, margin + 110, currentY);
    currentY += 5;
  });
};

// ========================================
// MAIN PDF GENERATION FUNCTION
// ========================================

export const generateEnhancedClientReport = async (options: PDFGenerationOptions) => {
  const { clientName, onProgress, onComplete, onError, profile, timelineProperties, projections } = options;

  try {
    onProgress?.('Analyzing strategy...');
    
    // Detect milestones and goals
    const milestones = detectMilestones(profile, timelineProperties, projections);
    const goalAchievement = detectGoalAchievement(profile, projections);
    
    onProgress?.('Creating PDF document...');
    
    // Create PDF in portrait mode
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const margin = 15;
    
    // Generate Page 1: Overview & Strategy
    onProgress?.('Building overview page...');
    await generatePage1(pdf, options, milestones);
    addPageFooter(pdf, 1, 4, options.agentBranding, margin);
    
    // Page 2: Investment Timeline (from existing elements)
    onProgress?.('Capturing Investment Timeline...');
    pdf.addPage();
    let currentY = addPageHeader(pdf, clientName, 'Investment Timeline', margin);
    
    const timelineElement = document.getElementById('pdf-timeline');
    if (timelineElement) {
      const timelineCanvas = await html2canvas(timelineElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const timelineImgData = timelineCanvas.toDataURL('image/png');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - (margin * 2);
      const timelineHeight = (timelineCanvas.height * contentWidth) / timelineCanvas.width;
      
      pdf.addImage(timelineImgData, 'PNG', margin, currentY, contentWidth, timelineHeight);
      currentY += timelineHeight + 10;
      
      // Add goal achievement banner
      if (currentY < pageHeight - 50) {
        currentY = addGoalBanner(pdf, goalAchievement, profile, currentY, margin);
      }
    }
    
    addPageFooter(pdf, 2, 4, options.agentBranding, margin);
    
    // Page 3: Performance Charts (from existing elements)
    onProgress?.('Capturing Performance Charts...');
    pdf.addPage();
    currentY = addPageHeader(pdf, clientName, 'Performance Charts', margin);
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    
    // Capture Portfolio Growth Chart
    const portfolioElement = document.getElementById('pdf-portfolio');
    if (portfolioElement) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const portfolioCanvas = await html2canvas(portfolioElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const portfolioImgData = portfolioCanvas.toDataURL('image/png');
      const portfolioHeight = (portfolioCanvas.height * contentWidth) / portfolioCanvas.width;
      
      if (currentY + portfolioHeight > pageHeight - margin - 30) {
        pdf.addPage();
        currentY = margin;
      }
      
      pdf.addImage(portfolioImgData, 'PNG', margin, currentY, contentWidth, portfolioHeight);
      currentY += portfolioHeight + 10;
    }
    
    // Capture Cashflow Chart
    const cashflowElement = document.getElementById('pdf-cashflow');
    if (cashflowElement) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cashflowCanvas = await html2canvas(cashflowElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const cashflowImgData = cashflowCanvas.toDataURL('image/png');
      const cashflowHeight = (cashflowCanvas.height * contentWidth) / cashflowCanvas.width;
      
      if (currentY + cashflowHeight > pageHeight - margin - 30) {
        pdf.addPage();
        currentY = margin;
      }
      
      pdf.addImage(cashflowImgData, 'PNG', margin, currentY, contentWidth, cashflowHeight);
    }
    
    addPageFooter(pdf, 3, 4, options.agentBranding, margin);
    
    // Page 4: Assumptions & Details
    onProgress?.('Building assumptions page...');
    generatePage4(pdf, options);
    addPageFooter(pdf, 4, 4, options.agentBranding, margin);
    
    // Save the PDF
    onProgress?.('Saving PDF...');
    const fileName = `${clientName.replace(/\s+/g, '_')}_Investment_Report.pdf`;
    pdf.save(fileName);
    
    onComplete?.();
  } catch (error) {
    console.error('Error generating PDF:', error);
    onError?.(error as Error);
  }
};

