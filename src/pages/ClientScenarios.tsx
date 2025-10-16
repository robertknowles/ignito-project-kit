import React, { useState } from 'react'
import {
  SearchIcon,
  PlusIcon,
  MoreHorizontalIcon,
  CalendarIcon,
} from 'lucide-react'
import { PropertyTimeline, Client as TimelineClient } from '../components/PropertyTimeline'
import { Navbar } from '../components/Navbar'
import { ClientCreationForm } from '../components/ClientCreationForm'
import { PDFReportRenderer } from '../components/PDFReportRenderer'
import { useClient, Client } from '@/contexts/ClientContext'
import { generateClientReport } from '../utils/pdfGenerator'
import { toast } from 'sonner'

const sampleClients: TimelineClient[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: 'https://i.pravatar.cc/150?img=1',
    purchases: [
      { year: 2025, propertyType: 'Unit', cost: 450000, propertyNumber: 1 },
      { year: 2027, propertyType: 'House', cost: 680000, propertyNumber: 2 },
      { year: 2029, propertyType: 'Apartment', cost: 520000, propertyNumber: 3 },
      { year: 2032, propertyType: 'Unit', cost: 480000, propertyNumber: 4 },
    ],
  },
  {
    id: '2',
    name: 'Michael Chen',
    avatar: 'https://i.pravatar.cc/150?img=2',
    purchases: [
      { year: 2026, propertyType: 'House', cost: 720000, propertyNumber: 1 },
      { year: 2028, propertyType: 'Apartment', cost: 550000, propertyNumber: 2 },
      { year: 2031, propertyType: 'Unit', cost: 460000, propertyNumber: 3 },
      { year: 2034, propertyType: 'House', cost: 750000, propertyNumber: 4 },
    ],
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    avatar: 'https://i.pravatar.cc/150?img=3',
    purchases: [
      { year: 2025, propertyType: 'Apartment', cost: 500000, propertyNumber: 1 },
      { year: 2026, propertyType: 'Unit', cost: 440000, propertyNumber: 2 },
      { year: 2027, propertyType: 'House', cost: 690000, propertyNumber: 3 },
      { year: 2030, propertyType: 'Apartment', cost: 530000, propertyNumber: 4 },
    ],
  },
  {
    id: '4',
    name: 'David Kim',
    avatar: 'https://i.pravatar.cc/150?img=4',
    purchases: [
      { year: 2025, propertyType: 'Unit', cost: 470000, propertyNumber: 1 },
      { year: 2028, propertyType: 'House', cost: 700000, propertyNumber: 2 },
      { year: 2031, propertyType: 'Apartment', cost: 540000, propertyNumber: 3 },
    ],
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    avatar: 'https://i.pravatar.cc/150?img=5',
    purchases: [
      { year: 2026, propertyType: 'House', cost: 710000, propertyNumber: 1 },
      { year: 2029, propertyType: 'Unit', cost: 490000, propertyNumber: 2 },
      { year: 2033, propertyType: 'Apartment', cost: 560000, propertyNumber: 3 },
    ],
  },
]

export const ClientScenarios = () => {
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [showPDFRenderer, setShowPDFRenderer] = useState(false);
  const { clients, setActiveClient } = useClient();

  const handleViewClient = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setActiveClient(client);
    }
  };

  const handleGeneratePDF = async (client: Client) => {
    // Set this client as active to ensure data is loaded
    setActiveClient(client);
    
    // Show the PDF renderer components
    setShowPDFRenderer(true);
    setPdfGenerating(true);
    
    // Wait for components to render
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.info('Generating PDF report...');
    
    await generateClientReport({
      clientName: client.name,
      onProgress: (stage) => {
        console.log('PDF Generation:', stage);
      },
      onComplete: () => {
        toast.success('PDF report generated successfully!');
        setPdfGenerating(false);
        setShowPDFRenderer(false);
      },
      onError: (error) => {
        toast.error(`Failed to generate PDF: ${error.message}`);
        setPdfGenerating(false);
        setShowPDFRenderer(false);
      },
    });
  };

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
                <button 
                  onClick={() => setCreateFormOpen(true)}
                  className="flex items-center gap-2 bg-[#3b82f6] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#2563eb] transition-colors"
                >
                  <PlusIcon size={16} />
                  <span>New Client</span>
                </button>
              </div>
            </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 border border-[#f3f4f6] hover:shadow-sm transition-shadow">
                <div className="text-3xl font-medium text-[#111827] mb-2">
                  {clients.length}
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
                    {clients.map((client) => {
                      const initials = client.name
                        .split(' ')
                        .map(word => word[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <tr key={client.id} className="border-b border-[#f3f4f6]">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-[#3b82f6] bg-opacity-60 flex items-center justify-center text-white text-sm mr-3">
                                {initials}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-[#111827]">
                                  {client.name}
                                </div>
                                <div className="text-xs text-[#6b7280]">
                                  Client ID: {client.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#374151]">
                            {client.notes ? (
                              <div>
                                <div className="flex items-center gap-2 text-sm text-[#374151]">
                                  <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                                  Active scenario
                                </div>
                                <div className="text-xs text-[#6b7280] truncate max-w-[200px]">
                                  {client.notes}
                                </div>
                              </div>
                            ) : (
                              'No scenario set'
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#374151]">
                            {new Date(client.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleViewClient(client.id)}
                                className="px-3 py-1 text-xs border border-[#f3f4f6] rounded text-[#374151] hover:bg-[#f9fafb] transition-colors"
                              >
                                View
                              </button>
                              <button 
                                onClick={() => handleGeneratePDF(client)}
                                disabled={pdfGenerating}
                                className="px-3 py-1 text-xs bg-[#3b82f6] rounded text-white hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {pdfGenerating ? 'Generating...' : 'Download'}
                              </button>
                              <button className="p-1 text-[#6b7280] hover:text-[#374151] transition-colors">
                                <MoreHorizontalIcon size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Planning Calendar */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <CalendarIcon size={18} className="text-[#6b7280]" />
                <h2 className="text-lg font-medium text-[#111827]">
                  Planning Calendar
                </h2>
              </div>
              <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
                <PropertyTimeline
                  clients={sampleClients}
                  startYear={2025}
                  endYear={2040}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ClientCreationForm 
        open={createFormOpen} 
        onOpenChange={setCreateFormOpen} 
      />
      
      {showPDFRenderer && <PDFReportRenderer visible={false} />}
    </div>
  )
}