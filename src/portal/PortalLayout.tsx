import React from 'react'
import { Outlet } from 'react-router-dom'
import { PortalSidebar } from './PortalSidebar'

/**
 * Client portal shell. Clients get the slim PortalSidebar (Property Plan +
 * Profile + sign out) rather than the full BA AppSidebar - the owner nav
 * (New Scenario, Search Clients, Compare, Toolkit, Client Management) is
 * agent tooling and must not be shown to portal clients (Rob, 2026-07-18).
 * PortalSidebar renders position:fixed at 200px; offset the content to match.
 */
export const PortalLayout = () => {
  return (
    <div className="main-app flex h-screen w-full bg-white">
      <PortalSidebar />
      <div
        id="main-content"
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: '200px' }}
      >
        <Outlet />
      </div>
    </div>
  )
}
