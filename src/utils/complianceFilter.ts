const REPLACEMENTS: [RegExp, string][] = [
  [/\bstrategy\b/gi, 'plan'],
  [/\bstrategic\b/gi, 'planned'],
  [/\bstrategies\b/gi, 'plans'],
  [/\bI recommend\b/gi, 'the model shows'],
  [/\brecommend(?:s|ed|ing)?\b/gi, 'suggest$1'],
  [/\brecommendation\b/gi, 'projection'],
  [/\bRecommendation\b/g, 'Projection'],
  [/\byou should\b/gi, 'one option is to'],
  [/\bshould consider\b/gi, 'could consider'],
  [/\baggressive\b/gi, 'growth-focused'],
  [/\bAggressive\b/g, 'Growth-focused'],
  [/\bpassive income\b/gi, 'rental income'],
  [/\bPassive Income\b/g, 'Rental Income'],
  [/\bpassive-income\b/gi, 'rental-income'],
  [/\bhigh[- ]yield\b/gi, 'higher-income'],
  [/\bHigh[- ]Yield\b/g, 'Higher-Income'],
  [/\bgoal achieved\b/gi, 'target position reached'],
  [/\bGoal Achieved\b/g, 'Target Position Reached'],
  [/\bgoals achieved\b/gi, 'targets reached'],
  [/\bGoals Achieved\b/g, 'Targets Reached'],
  [/\baccumulation phase\b/gi, 'acquisition period'],
  [/\bconsolidation phase\b/gi, 'hold period'],
  [/\bwealth building\b/gi, 'equity growth'],
  [/\bwealth creation\b/gi, 'portfolio growth'],
  [/\binvestment strategy\b/gi, 'investment plan'],
  [/\bInvestment Strategy\b/g, 'Investment Plan'],
];

export function filterComplianceLanguage(text: string): string {
  let result = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
