import React from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar, SIDEBAR_WIDTH } from '@/components/AppSidebar'

/**
 * Client portal shell. Uses the exact same AppSidebar as the BA dashboard so
 * the client's experience is visually identical to the agent side - same nav
 * rail, fonts, spacing and branding. AppSidebar renders itself `position:fixed`
 * and publishes its live width as `--app-sidebar-width`; we offset the content
 * with that variable (same pattern as the main App shell) so collapsing the
 * rail reflows correctly.
 */
export const PortalLayout = () => {
  return (
    <div className="main-app flex h-screen w-full bg-white">
      <AppSidebar />
      <div
        id="main-content"
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: `var(--app-sidebar-width, ${SIDEBAR_WIDTH}px)` }}
      >
        <Outlet />
      </div>
    </div>
  )
}
