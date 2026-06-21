import React, { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as OfficialPostHogProvider } from 'posthog-js/react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * PostHog product analytics.
 *
 * Captures how beta testers use the app — page views, clicks (autocapture),
 * and session replays — so we can see real usage without hand-instrumenting
 * every button.
 *
 * Configured entirely through env vars so it stays off in any environment
 * that doesn't set a key (local dev without analytics, CI, etc.):
 *   VITE_POSTHOG_KEY   — project API key (starts with "phc_")
 *   VITE_POSTHOG_HOST  — ingestion host (defaults to PostHog US cloud)
 *
 * When the key is absent this whole layer becomes a no-op pass-through.
 */
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  'https://us.i.posthog.com';

export const posthogEnabled = Boolean(POSTHOG_KEY);

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!posthogEnabled) {
    return <>{children}</>;
  }

  return (
    <OfficialPostHogProvider
      apiKey={POSTHOG_KEY as string}
      options={{
        api_host: POSTHOG_HOST,
        // Capture clicks/inputs automatically without manual tagging.
        autocapture: true,
        // SPA page views on route changes are handled by posthog-js.
        capture_pageview: true,
        // Record sessions so we can watch how testers actually move through
        // the app. PostHog masks all text input by default, so client PII
        // typed into forms is not recorded.
        disable_session_recording: false,
        persistence: 'localStorage+cookie',
      }}
    >
      {children}
    </OfficialPostHogProvider>
  );
}

/**
 * Ties analytics events to the signed-in agent. Renders nothing.
 *
 * Must live inside both PostHogProvider and AuthProvider. On login it calls
 * identify() with the user's id + a few non-sensitive properties; on logout
 * it resets so the next session isn't attributed to the previous user.
 */
export function PostHogIdentify() {
  const { user, role, companyId, subscriptionTier } = useAuth();

  useEffect(() => {
    if (!posthogEnabled) return;

    if (user?.id) {
      posthog.identify(user.id, {
        email: user.email,
        role,
        company_id: companyId,
        subscription_tier: subscriptionTier,
      });
      if (companyId) {
        posthog.group('company', companyId);
      }
    } else {
      posthog.reset();
    }
  }, [user?.id, user?.email, role, companyId, subscriptionTier]);

  return null;
}
