import React from 'react'
import { AppSidebar, SIDEBAR_WIDTH } from '@/components/AppSidebar'

const Toolkit: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-white">
      <AppSidebar />
      <main className="flex-1 px-8 py-8" style={{ marginLeft: SIDEBAR_WIDTH }}>
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Toolkit</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
        </div>
      </main>
    </div>
  )
}

export default Toolkit
