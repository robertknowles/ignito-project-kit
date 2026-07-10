import posthog from 'posthog-js';

/**
 * Product analytics - the named "moments that matter".
 *
 * PostHog already auto-captures every click and page view. On top of that we
 * track the specific actions below so the dashboards can answer real product
 * questions: how many testers generate a plan, save a scenario, share it with
 * a client, and so on.
 *
 * Keep every tracked action in this one catalog so event names stay
 * consistent - PostHog groups by exact event name, and a typo means a
 * silently split funnel. To add a new event: add it here, then call
 * `track(EVENTS.yourEvent, { ...props })` at the success point in the code.
 *
 * Privacy: never put client PII (names, emails, addresses, dollar figures) in
 * the properties. Stick to counts, flags, and internal type ids.
 */
export const EVENTS = {
  // Acquisition / return
  signedUp: 'signed_up',
  loggedIn: 'logged_in',
  // Activation
  clientCreated: 'client_created',
  planGenerated: 'plan_generated',
  // Engagement
  chatMessageSent: 'chat_message_sent',
  propertyAddedToTimeline: 'property_added_to_timeline',
  propertyRemovedFromTimeline: 'property_removed_from_timeline',
  scenarioSaved: 'scenario_saved',
  scenariosCompared: 'scenarios_compared',
  // Delivering value to the end client
  reportExportedPdf: 'report_exported_pdf',
  planShared: 'plan_shared',
  // Fine-grained interaction (how people use components inside the platform)
  chartHovered: 'chart_hovered',
  tabViewed: 'tab_viewed',
  tableCellEdited: 'table_cell_edited',
  assumptionChanged: 'assumption_changed',
} as const;

export type AnalyticsEvent = (typeof EVENTS)[keyof typeof EVENTS];

const ANALYTICS_ENABLED = Boolean(import.meta.env.VITE_POSTHOG_KEY);

/**
 * Send a named event to PostHog. No-ops when analytics is disabled (no key),
 * and never throws - analytics must not be able to break the app.
 */
export function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
): void {
  if (!ANALYTICS_ENABLED) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Swallow - a failed analytics call should never surface to the user.
  }
}

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Like `track`, but collapses rapid repeats that share a `key` into a single
 * event fired `ms` after the last call. Use for continuous inputs (e.g.
 * dragging a slider) so one adjustment = one event instead of hundreds.
 */
export function trackDebounced(
  event: AnalyticsEvent,
  properties: Record<string, unknown> | undefined,
  key: string,
  ms = 800,
): void {
  if (!ANALYTICS_ENABLED) return;
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      track(event, properties);
    }, ms),
  );
}
