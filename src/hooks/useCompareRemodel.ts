/**
 * useCompareRemodel — the "Remodel with AI" brain for the Compare page.
 *
 * Takes a BASE scenario (a copy of the selected saved plan), sends the BA's
 * instruction to the same nl-parse edge function the dashboard chat uses,
 * applies the response to a scenario copy via the pure mutator, and re-runs
 * the headless engine on the result. The client's real scenario is never
 * touched; the draft lives only in Compare state until explicitly saved.
 *
 * Follow-up instructions compose: each one mutates the CURRENT draft, and the
 * AI receives the draft (not the base) as its currentPlan context.
 */

import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useScenarioRunner } from './useScenarioRunner';
import { applyNlResponseToScenario } from '@/engine/scenarioMutator';
import type { ScenarioInput, ScenarioRunResult } from '@/engine/scenarioRunner';
import type { NLParseResponse, CurrentPlanState } from '@/types/nlParse';
import type { PropertyInstanceDetails } from '@/types/propertyInstance';

export interface RemodelDraft {
  scenario: ScenarioInput;
  run: ScenarioRunResult;
  /** Cumulative across refinements — keeps changed rows highlighted. */
  changedInstanceIds: string[];
  /** Mapper warnings from the LATEST instruction. */
  warnings: string[];
}

const NL_PARSE_TIMEOUT_MS = 30_000;
const HISTORY_WINDOW = 20;

/** Mirror of ChatPanel.getCurrentPlan, built from a headless run instead of
 *  live contexts — so the AI sees the draft's actual engine numbers. */
const buildCurrentPlan = (scenario: ScenarioInput, run: ScenarioRunResult): CurrentPlanState => {
  const profile = run.profile;

  let enginePlanState: CurrentPlanState['enginePlanState'];
  const growthData = run.projection.portfolioGrowthData;
  if (growthData.length > 0) {
    const baseYearNum = parseInt(growthData[0]?.year ?? '2025', 10);
    const horizonYear = baseYearNum + (profile.timelineYears ?? 20);
    const horizonPoint =
      growthData.find(d => parseInt(d.year, 10) >= horizonYear) ??
      growthData[growthData.length - 1];
    const equityGoalReachedPoint =
      profile.equityGoal > 0
        ? growthData.find(d => d.equity >= profile.equityGoal)
        : undefined;
    enginePlanState = {
      horizonYear,
      projectedPortfolioValue: Math.round(horizonPoint?.portfolioValue ?? 0),
      projectedEquity: Math.round(horizonPoint?.equity ?? 0),
      equityGoalReachedYear: equityGoalReachedPoint
        ? parseInt(equityGoalReachedPoint.year, 10)
        : null,
    };
  }

  return {
    investmentProfile: {
      depositPool: profile.depositPool,
      annualSavings: profile.annualSavings,
      baseSalary: profile.baseSalary,
      timelineYears: profile.timelineYears,
      equityGoal: profile.equityGoal,
      cashflowGoal: profile.cashflowGoal,
    },
    properties: scenario.propertyOrder.map((instanceId, i) => {
      const inst = run.instances[instanceId];
      const engineProp = run.timelineProperties.find(tp => tp.instanceId === instanceId);
      return {
        instanceId,
        type: instanceId.replace(/_instance_\d+$/, ''),
        purchasePrice: inst?.purchasePrice ?? 0,
        state: inst?.state ?? 'VIC',
        period: inst?.manualPlacementPeriod ?? i + 1,
        growthAssumption: (inst?.growthAssumption ?? 'High') as 'High' | 'Medium' | 'Low',
        loanProduct: (inst?.loanProduct ?? 'IO') as 'IO' | 'PI',
        lvr: inst?.lvr ?? 88,
        entity: inst?.entity,
        engineStatus: engineProp?.status as 'feasible' | 'challenging' | undefined,
        borrowingCapacityRemaining: engineProp?.borrowingCapacityRemaining,
      };
    }),
    clientNames: [],
    enginePlanState,
  };
};

export const useCompareRemodel = (baseScenario: ScenarioInput | null) => {
  const { user } = useAuth();
  const { run } = useScenarioRunner();

  const [draft, setDraft] = useState<RemodelDraft | null>(null);
  // First-draft proposal held for BA review before it lands in the graphs.
  // Refinements skip this and apply to `draft` live.
  const [pending, setPending] = useState<RemodelDraft | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  // Monotonic id so a stale in-flight response can't land after a reset.
  const sessionRef = useRef(0);

  const reset = useCallback(() => {
    sessionRef.current += 1;
    historyRef.current = [];
    setDraft(null);
    setPending(null);
    setAiMessage(null);
    setError(null);
    setIsThinking(false);
  }, []);

  const submit = useCallback(
    async (instruction: string) => {
      const text = instruction.trim();
      if (!text || !baseScenario || isThinking) return;

      const session = sessionRef.current;
      setIsThinking(true);
      setError(null);

      try {
        // Refinements target the current draft; the first instruction targets
        // the base. Run the target so the AI's plan context carries the same
        // engine numbers the page shows.
        const targetScenario = draft?.scenario ?? baseScenario;
        const targetRun = draft?.run ?? run(baseScenario);
        const currentPlan = buildCurrentPlan(targetScenario, targetRun);

        const invokePromise = supabase.functions.invoke('nl-parse', {
          body: {
            message: text,
            conversationHistory: historyRef.current.slice(-HISTORY_WINDOW),
            currentPlan,
            userId: user?.id,
            strategyPreset: targetRun.profile.strategyPreset ?? 'eg-low',
            // Remodel mode: the prompt tells the AI to act on directional
            // instructions with stated assumptions instead of asking
            // clarifying questions (this box is one-shot, not a chat).
            requestContext: 'remodel',
          },
        });

        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error('TIMEOUT')), NL_PARSE_TIMEOUT_MS);
        });

        let result: Awaited<typeof invokePromise>;
        try {
          result = await Promise.race([invokePromise, timeoutPromise]);
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        }

        if (result.error || !result.data || result.data.error) {
          const msg = result.data?.error || result.error?.message || 'Failed to reach PropPath AI';
          throw new Error(msg);
        }

        const response = result.data as NLParseResponse;
        if (session !== sessionRef.current) return; // reset happened mid-flight

        historyRef.current = [
          ...historyRef.current,
          { role: 'user', content: text },
          { role: 'assistant', content: response.message ?? '' },
        ].slice(-HISTORY_WINDOW);

        if (response.type === 'modification' || response.type === 'update_profile') {
          const mutation = applyNlResponseToScenario(targetScenario, response);
          if (mutation.didChange) {
            const newRun = run(mutation.scenario);
            if (draft) {
              // Refinement of an already-approved Scenario B: apply live so the
              // graphs update immediately (mirrors the dashboard's small-tweak flow).
              setDraft(prev => ({
                scenario: mutation.scenario,
                run: newRun,
                changedInstanceIds: [
                  ...new Set([...(prev?.changedInstanceIds ?? []), ...mutation.changedInstanceIds]),
                ],
                warnings: mutation.warnings,
              }));
            } else {
              // First draft: hold for review in the confirmation brief before it
              // lands in the tables/charts.
              setPending({
                scenario: mutation.scenario,
                run: newRun,
                changedInstanceIds: mutation.changedInstanceIds,
                warnings: mutation.warnings,
              });
            }
          } else {
            // The AI said it changed something but nothing applied — surface
            // that instead of letting "Done!" stand (nlDataMapper contract).
            const dropNote = mutation.warnings.length > 0
              ? mutation.warnings.join(' ')
              : "That instruction didn't map to a change the model supports yet.";
            setError(dropNote);
          }
        }

        setAiMessage(response.message ?? null);
      } catch (e) {
        if (session === sessionRef.current) {
          const msg = e instanceof Error ? e.message : 'Something went wrong';
          setError(msg === 'TIMEOUT' ? 'The AI took too long to respond — try again.' : msg);
        }
      } finally {
        if (session === sessionRef.current) setIsThinking(false);
      }
    },
    [baseScenario, draft, isThinking, run, user?.id],
  );

  // Direct (non-AI) edit of a single draft instance — the BA hand-tunes a
  // Scenario B property in the row-detail dialog. Re-runs the SAME headless
  // engine used for AI drafts, so charts, StatStrip and model-check notes
  // update off the new `draft.run`. Does not touch changedInstanceIds
  // (manual edits are not highlighted) or aiMessage/warnings.
  // Pure re-run of a single instance patch on any draft (live or pending).
  const patchDraft = useCallback(
    (prev: RemodelDraft | null, instanceId: string, patch: Partial<PropertyInstanceDetails>) => {
      if (!prev) return prev;
      // Fall back to the run's materialized instance if the scenario blob
      // didn't carry one (runScenario defaults missing instances).
      const current =
        prev.scenario.propertyInstances[instanceId] ?? prev.run.instances[instanceId];
      if (!current) return prev;
      const nextScenario: ScenarioInput = {
        ...prev.scenario,
        propertyInstances: {
          ...prev.scenario.propertyInstances,
          [instanceId]: { ...current, ...patch },
        },
      };
      return { ...prev, scenario: nextScenario, run: run(nextScenario) };
    },
    [run],
  );

  const editInstance = useCallback(
    (instanceId: string, patch: Partial<PropertyInstanceDetails>) => {
      setDraft(prev => patchDraft(prev, instanceId, patch));
    },
    [patchDraft],
  );

  // Hand-tune a proposed Scenario B property inside the review brief, before
  // it is approved into the graphs.
  const editPending = useCallback(
    (instanceId: string, patch: Partial<PropertyInstanceDetails>) => {
      setPending(prev => patchDraft(prev, instanceId, patch));
    },
    [patchDraft],
  );

  // Promote the reviewed proposal into the live Scenario B draft.
  const approvePending = useCallback(() => {
    if (!pending) return;
    setDraft(pending);
    setPending(null);
  }, [pending]);

  const discardPending = useCallback(() => {
    setPending(null);
    setError(null);
  }, []);

  return {
    draft,
    pending,
    isThinking,
    aiMessage,
    error,
    submit,
    reset,
    editInstance,
    editPending,
    approvePending,
    discardPending,
  };
};
