import React from 'react'
import { Outlet } from 'react-router-dom'
import { PortalSidebar } from './PortalSidebar'

export const PortalLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <PortalSidebar />
      <main className="ml-[200px] min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
