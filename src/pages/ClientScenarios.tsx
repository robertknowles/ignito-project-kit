import React from 'react'
import {
  SearchIcon,
  PlusIcon,
  MoreHorizontalIcon,
  CalendarIcon,
} from 'lucide-react'
import { YearlyCalendar } from '../components/YearlyCalendar'
import { Navbar } from '../components/Navbar'
export const ClientScenarios = () => {
  return (
    <div className="flex flex-col h-screen w-full bg-[#f9fafb] font-sans">
      <Navbar />
      <div className="flex-1 overflow-hidden pb-8 px-8">
        <div className="bg-white rounded-lg h-full overflow-auto shadow-sm">
          <div className="flex-1 overflow-auto p-8 bg-white">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-xl font-medium text-[#111827]">
                Client Scenarios
              </h1>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search clients..."
                    className="pl-9 pr-4 py-2 border border-[#f3f4f6] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6] w-64"
                  />
                  <SearchIcon
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6b7280]"
                  />
                </div>
                <button className="flex items-center gap-2 bg-[#3b82f6] text-white px-4 py-2 rounded-lg text-sm">
                  <PlusIcon size={16} />
                  <span>New Client</span>
                </button>
              </div>
            </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 border border-[#f3f4f6] hover:shadow-sm transition-shadow">
                <div className="text-3xl font-medium text-[#111827] mb-2">
                  2
                </div>
                <div className="text-sm text-[#6b7280]">Total Clients</div>
              </div>
              <div className="bg-white rounded-lg p-6 border border-[#f3f4f6] hover:shadow-sm transition-shadow">
                <div className="text-3xl font-medium text-[#111827] mb-2">
                  1
                </div>
                <div className="text-sm text-[#6b7280]">Active Scenarios</div>
              </div>
              <div className="bg-white rounded-lg p-6 border border-[#f3f4f6] hover:shadow-sm transition-shadow">
                <div className="text-3xl font-medium text-[#111827] mb-2">
                  0
                </div>
                <div className="text-sm text-[#6b7280]">Pending Reviews</div>
              </div>
              <div className="bg-white rounded-lg p-6 border border-[#f3f4f6] hover:shadow-sm transition-shadow">
                <div className="text-3xl font-medium text-[#111827] mb-2">
                  1
                </div>
                <div className="text-sm text-[#6b7280]">Purchasing Soon</div>
              </div>
            </div>
            {/* 5 Year Calendar */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <CalendarIcon size={18} className="text-[#6b7280]" />
                <h2 className="text-lg font-medium text-[#111827]">
                  Planning Calendar
                </h2>
              </div>
              <YearlyCalendar />
            </div>
            {/* Client Portfolio */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-[#111827] mb-4">
                Client Portfolio
              </h2>
              <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#f3f4f6] text-left">
                      <th className="px-6 py-3 text-xs font-medium text-[#6b7280]">
                        Client
                      </th>
                      <th className="px-6 py-3 text-xs font-medium text-[#6b7280]">
                        Next Purchase
                      </th>
                      <th className="px-6 py-3 text-xs font-medium text-[#6b7280]">
                        Created
                      </th>
                      <th className="px-6 py-3 text-xs font-medium text-[#6b7280]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#f3f4f6]">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-[#3b82f6] bg-opacity-60 flex items-center justify-center text-white text-sm mr-3">
                            JC
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#111827]">
                              James Casery
                            </div>
                            <div className="text-xs text-[#6b7280]">
                              Client ID: 6
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#374151]">
                        No scenario set
                      </td>
                      <td className="px-6 py-4 text-sm text-[#374151]">
                        3 days ago
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1 text-xs border border-[#f3f4f6] rounded text-[#374151] hover:bg-[#f9fafb]">
                            View
                          </button>
                          <button className="px-3 py-1 text-xs bg-[#3b82f6] rounded text-white hover:bg-opacity-90">
                            Send
                          </button>
                          <button className="p-1 text-[#6b7280] hover:text-[#374151]">
                            <MoreHorizontalIcon size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-[#10b981] bg-opacity-50 flex items-center justify-center text-white text-sm mr-3">
                            RK
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#111827]">
                              Robert Knowles
                            </div>
                            <div className="text-xs text-[#6b7280]">
                              Client ID: 5
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-[#374151]">
                            <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                            Ready now
                          </div>
                          <div className="text-xs text-[#6b7280]">
                            $50k available
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#374151]">
                        3 days ago
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1 text-xs border border-[#f3f4f6] rounded text-[#374151] hover:bg-[#f9fafb]">
                            View
                          </button>
                          <button className="px-3 py-1 text-xs bg-[#3b82f6] rounded text-white hover:bg-opacity-90">
                            Send
                          </button>
                          <button className="p-1 text-[#6b7280] hover:text-[#374151]">
                            <MoreHorizontalIcon size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}