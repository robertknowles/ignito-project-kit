import { useEffect, useRef } from 'react'
import { track, EVENTS } from '@/lib/analytics'

/**
 * Tracks "meaningful" hovers over a chart so we can see which charts draw the
 * most attention. Returns handlers to spread onto the chart's container.
 *
 * Two guards keep the event count sane:
 *  - dwell: the cursor must stay for `dwellMs` before it counts (a hover that
 *    just passes through on the way somewhere else is ignored).
 *  - cooldown: the same chart won't re-fire more than once per `cooldownMs`,
 *    so wiggling the mouse over one chart doesn't spam events.
 */
export function useChartHoverTracking(
  chartTitle: string,
  { dwellMs = 400, cooldownMs = 5000 }: { dwellMs?: number; cooldownMs?: number } = {},
) {
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFiredAt = useRef(0)

  // performance.now() is allowed (unlike Date.now()) and is monotonic.
  const onMouseEnter = () => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current)
    dwellTimer.current = setTimeout(() => {
      const now = performance.now()
      if (now - lastFiredAt.current < cooldownMs) return
      lastFiredAt.current = now
      track(EVENTS.chartHovered, { chart: chartTitle })
    }, dwellMs)
  }

  const onMouseLeave = () => {
    if (dwellTimer.current) {
      clearTimeout(dwellTimer.current)
      dwellTimer.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (dwellTimer.current) clearTimeout(dwellTimer.current)
    }
  }, [])

  return { onMouseEnter, onMouseLeave }
}

/**
 * Tracks how long a user stays on each tab within a section. Pass the current
 * active tab; whenever it changes — and when the component unmounts or the
 * page is hidden — it fires `tab_viewed` for the tab being left, with the
 * seconds spent on it. `section` namespaces the tabs (e.g. 'main_tab',
 * 'brief_subtab') so the same tab name in different places doesn't collide.
 */
export function useTabDwellTracking(section: string, activeTab: string) {
  const currentTab = useRef(activeTab)
  const enteredAt = useRef(performance.now())

  const flush = () => {
    const seconds = Math.round((performance.now() - enteredAt.current) / 1000)
    // Ignore sub-second blips (e.g. an initial double-render).
    if (seconds >= 1) {
      track(EVENTS.tabViewed, { section, tab: currentTab.current, seconds_spent: seconds })
    }
  }

  // Fire when the tab changes.
  useEffect(() => {
    if (activeTab === currentTab.current) return
    flush()
    currentTab.current = activeTab
    enteredAt.current = performance.now()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Flush the final tab's time when the page is hidden or the view unmounts.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
