import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  SearchIcon,
  PlusIcon,
  MoreHorizontalIcon,
  CalendarIcon,
  Edit2Icon,
  Trash2Icon,
  LinkIcon,
  CheckCircle2,
  Clock,
  AlertTriangleIcon,
} from 'lucide-react'
import { PropertyTimeline } from '../components/PropertyTimeline'
import { LeftRail } from '../components/LeftRail'
import { ClientCreationForm } from '../components/ClientCreationForm'
import { PDFReportRenderer } from '../components/PDFReportRenderer'
import { useClient, Client } from '@/contexts/ClientContext'
import { useAuth } from '@/contexts/AuthContext'
import { generateClientReport } from '../utils/pdfGenerator'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useAllClientScenarios } from '../hooks/useAllClientScenarios'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

// Track onboarding status per client
interface OnboardingStatus {
  hasOnboardingId: boolean;
  isCompleted: boolean;
  onboardingId: string | null;
}

export const ClientScenarios = () => {
  const navigate = useNavigate();
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [showPDFRenderer, setShowPDFRenderer] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const { clients, setActiveClient, updateClient, deleteClient, activeSeats, seatLimit, canAddClient } = useClient();
  const { companyId } = useAuth();
  
  // Seat usage calculations
  const seatUsagePercent = seatLimit > 0 ? (activeSeats / seatLimit) * 100 : 0;
  const isNearLimit = seatUsagePercent >= 80;
  const isAtLimit = activeSeats >= seatLimit;
  const { timelineData, loading: timelineLoading } = useAllClientScenarios();
  
  // Track onboarding status for each client
  const [onboardingStatuses, setOnboardingStatuses] = useState<Record<number, OnboardingStatus>>({});

  // Fetch onboarding status for all clients
  useEffect(() => {
    const fetchOnboardingStatuses = async () => {
      if (clients.length === 0) return;

      try {
        const clientIds = clients.map(c => c.id);
        const { data: scenarios, error } = await supabase
          .from('scenarios')
          .select('client_id, onboarding_id, data')
          .in('client_id', clientIds);

        if (error) throw error;

        const statusMap: Record<number, OnboardingStatus> = {};
        
        // Initialize all clients with no onboarding
        clients.forEach(client => {
          statusMap[client.id] = {
            hasOnboardingId: false,
            isCompleted: false,
            onboardingId: null,
          };
        });

        // Update with actual data
        scenarios?.forEach(scenario => {
          const data = scenario.data as any;
          statusMap[scenario.client_id] = {
            hasOnboardingId: !!scenario.onboarding_id,
            isCompleted: data?.onboardingCompleted === true,
            onboardingId: scenario.onboarding_id,
          };
        });

        setOnboardingStatuses(statusMap);
      } catch (error) {
        console.error('Error fetching onboarding statuses:', error);
      }
    };

    fetchOnboardingStatuses();
  }, [clients]);

  // Calculate dynamic stats from timelineData
  const currentYear = new Date().getFullYear();
  
  const stats = useMemo(() => {
    const totalClients = clients.length;
    
    // Count clients with at least one active scenario (excluding "No Scenario")
    const activeScenarios = timelineData.filter(
      (entry) => entry.scenarioName !== 'No Scenario' && entry.purchases.length > 0
    ).length;
    
    // Count clients purchasing within next 2 years
    const purchasingSoon = new Set(
      timelineData
        .filter((entry) =>
          entry.purchases.some((p) => p.year >= currentYear && p.year <= currentYear + 2)
        )
        .map((entry) => entry.clientId)
    ).size;
    
    return {
      totalClients,
      activeScenarios,
      purchasingSoon,
    };
  }, [clients.length, timelineData, currentYear]);

  // Helper function to get the next purchase year for a specific client
  const getNextPurchaseYear = (clientId: number): number | null => {
    const clientEntries = timelineData.filter((entry) => entry.clientId === clientId);
    const allPurchases = clientEntries.flatMap((entry) => entry.purchases);
    const futurePurchases = allPurchases.filter((p) => p.year >= currentYear);
    
    if (futurePurchases.length === 0) return null;
    
    return Math.min(...futurePurchases.map((p) => p.year));
  };

  const handleViewClient = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setActiveClient(client);
      navigate('/dashboard');
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

  const handleRenameClick = (client: Client) => {
    setSelectedClient(client);
    setNewClientName(client.name);
    setRenameDialogOpen(true);
  };

  const handleRenameConfirm = async () => {
    if (!selectedClient || !newClientName.trim()) return;

    const success = await updateClient(selectedClient.id, { name: newClientName.trim() });
    
    if (success) {
      toast.success('Client renamed successfully!');
      setRenameDialogOpen(false);
      setSelectedClient(null);
      setNewClientName('');
    } else {
      toast.error('Failed to rename client');
    }
  };

  const handleDeleteClick = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedClient) return;

    const success = await deleteClient(selectedClient.id);
    
    if (success) {
      toast.success('Client deleted successfully!');
      setDeleteDialogOpen(false);
      setSelectedClient(null);
    } else {
      toast.error('Failed to delete client');
    }
  };

  // Generate onboarding link for a client
  const handleGenerateOnboardingLink = async (client: Client) => {
    try {
      // Check if a scenario exists for this client
      const { data: existingScenarios, error: fetchError } = await supabase
        .from('scenarios')
        .select('id, onboarding_id')
        .eq('client_id', client.id)
        .limit(1);

      if (fetchError) throw fetchError;

      let scenarioId: number;
      let onboardingId: string;

      if (existingScenarios && existingScenarios.length > 0) {
        // Scenario exists
        scenarioId = existingScenarios[0].id;
        onboardingId = existingScenarios[0].onboarding_id;

        // If no onboarding_id exists, generate one
        if (!onboardingId) {
          onboardingId = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);

          const { error: updateError } = await supabase
            .from('scenarios')
            .update({ onboarding_id: onboardingId })
            .eq('id', scenarioId);

          if (updateError) throw updateError;
        }
      } else {
        // No scenario exists, create a default one
        onboardingId = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);

        const { data: newScenario, error: insertError } = await supabase
          .from('scenarios')
          .insert({
            name: `${client.name}'s Scenario`,
            client_id: client.id,
            company_id: companyId,
            onboarding_id: onboardingId,
            client_display_name: client.name,
            data: {
              propertySelections: {},
              investmentProfile: {
                depositPool: 50000,
                borrowingCapacity: 500000,
                portfolioValue: 0,
                currentDebt: 0,
                annualSavings: 24000,
                timelineYears: 15,
                equityGoal: 1000000,
                cashflowGoal: 50000,
              },
            },
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (!newScenario) throw new Error('Failed to create scenario');

        scenarioId = newScenario.id;
      }

      // Update local state
      setOnboardingStatuses(prev => ({
        ...prev,
        [client.id]: {
          hasOnboardingId: true,
          isCompleted: prev[client.id]?.isCompleted || false,
          onboardingId: onboardingId,
        },
      }));

      // Generate the onboarding URL
      const onboardingUrl = `${window.location.origin}/onboarding/${onboardingId}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(onboardingUrl);

      toast.success('Onboarding link copied to clipboard!', {
        description: 'Share this link with your client to collect their financial details.',
      });
    } catch (error) {
      console.error('Error generating onboarding link:', error);
      toast.error('Failed to generate onboarding link');
    }
  };

  // Get onboarding button content based on status
  const getOnboardingButton = (client: Client) => {
    const status = onboardingStatuses[client.id];
    
    if (status?.isCompleted) {
      // Completed - show green checkmark
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => handleGenerateOnboardingLink(client)}
              className="px-2.5 py-1 text-xs rounded flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
            >
              <CheckCircle2 size={12} />
              <span>Onboarded</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Client has completed onboarding. Click to copy link again.</p>
          </TooltipContent>
        </Tooltip>
      );
    } else if (status?.hasOnboardingId) {
      // Pending - link sent but not completed
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => handleGenerateOnboardingLink(client)}
              className="px-2.5 py-1 text-xs rounded flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <Clock size={12} />
              <span>Pending</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Onboarding link sent, awaiting completion. Click to copy link again.</p>
          </TooltipContent>
        </Tooltip>
      );
    } else {
      // No link generated yet
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => handleGenerateOnboardingLink(client)}
              className="px-2.5 py-1 text-xs rounded flex items-center gap-1.5 border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] transition-colors"
            >
              <LinkIcon size={12} />
              <span>Onboard</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Generate and copy onboarding link for this client</p>
          </TooltipContent>
        </Tooltip>
      );
    }
  };

  return (
    <TooltipProvider>
      <div className="main-app flex h-screen w-full bg-[#f9fafb]">
        <LeftRail />
        <div className="flex-1 ml-16 overflow-hidden">
          <div className="bg-white h-full overflow-auto">
            <div className="flex-1 overflow-auto p-8 bg-white">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-xl font-medium text-[#111827]">
                  Client Scenarios
                </h1>
                <div className="flex items-center gap-4 relative z-10">
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
              {/* Seat Usage Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="col-span-2 bg-white rounded-lg p-5 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-[#111827]">Seat Usage</h3>
                      <p className="text-xs text-[#6b7280]">Client seats used</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-[#111827]">
                        {activeSeats} <span className="text-base font-normal text-[#6b7280]">of {seatLimit}</span>
                      </div>
                      <p className="text-xs text-[#6b7280]">seats used</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isAtLimit
                          ? 'bg-red-500'
                          : isNearLimit
                          ? 'bg-amber-500'
                          : 'bg-[#3b82f6]'
                      }`}
                      style={{ width: `${Math.min(seatUsagePercent, 100)}%` }}
                    />
                  </div>

                  {isAtLimit && (
                    <div className="flex items-center gap-2 text-red-600 text-xs">
                      <AlertTriangleIcon size={14} />
                      <span>Seat limit reached. Upgrade your plan to add more clients.</span>
                    </div>
                  )}
                  {isNearLimit && !isAtLimit && (
                    <div className="flex items-center gap-2 text-amber-600 text-xs">
                      <AlertTriangleIcon size={14} />
                      <span>Approaching seat limit. Consider upgrading soon.</span>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg p-5 border border-gray-200">
                  <div className="text-2xl font-semibold text-[#111827] mb-1">
                    {seatLimit - activeSeats}
                  </div>
                  <div className="text-xs text-[#6b7280]">Available Seats</div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg p-6 border border-[#f3f4f6] hover:shadow-sm transition-shadow">
                  <div className="text-3xl font-medium text-[#111827] mb-2">
                    {stats.totalClients}
                  </div>
                  <div className="text-sm text-[#6b7280]">Total Clients</div>
                </div>
                <div className="bg-white rounded-lg p-6 border border-[#f3f4f6] hover:shadow-sm transition-shadow">
                  <div className="text-3xl font-medium text-[#111827] mb-2">
                    {stats.activeScenarios}
                  </div>
                  <div className="text-sm text-[#6b7280]">Active Scenarios</div>
                </div>
                <div className="bg-white rounded-lg p-6 border border-[#f3f4f6] hover:shadow-sm transition-shadow">
                  <div className="text-3xl font-medium text-[#111827] mb-2">
                    {stats.purchasingSoon}
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
                                <div className="text-sm font-medium text-[#111827]">
                                  {client.name}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-[#374151]">
                              {(() => {
                                const nextYear = getNextPurchaseYear(client.id);
                                if (nextYear) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-green-300/70"></span>
                                      <span>Property in {nextYear}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <span className="text-[#6b7280]">No active plan</span>
                                );
                              })()}
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
                                {getOnboardingButton(client)}
                                <button 
                                  onClick={() => handleGeneratePDF(client)}
                                  disabled={pdfGenerating}
                                  className="px-3 py-1 text-xs bg-[#3b82f6] rounded text-white hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {pdfGenerating ? 'Generating...' : 'Download'}
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1 text-[#6b7280] hover:text-[#374151] transition-colors">
                                      <MoreHorizontalIcon size={16} />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem 
                                      onClick={() => handleRenameClick(client)}
                                      className="cursor-pointer"
                                    >
                                      <Edit2Icon size={14} className="mr-2" />
                                      Rename Client
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteClick(client)}
                                      className="cursor-pointer text-red-700 focus:text-red-700"
                                    >
                                      <Trash2Icon size={14} className="mr-2" />
                                      Delete Client
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
                  <h2 className="text-lg font-medium text-[#111827]">
                    Planning Calendar
                  </h2>
                </div>
                <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
                  {timelineLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-sm text-gray-500">Loading timeline data...</div>
                    </div>
                  ) : timelineData.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <CalendarIcon size={48} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No client scenarios to display</p>
                        <p className="text-xs text-gray-400 mt-1">Create scenarios for clients to see them here</p>
                      </div>
                    </div>
                  ) : (
                    <PropertyTimeline
                      clients={timelineData}
                      startYear={2025}
                      endYear={2040}
                    />
                  )}
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

        {/* Rename Dialog */}
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Client</DialogTitle>
              <DialogDescription>
                Enter a new name for {selectedClient?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Client Name</Label>
                <Input
                  id="name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Enter client name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameConfirm();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenameConfirm} disabled={!newClientName.trim()}>
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedClient?.name}? This action cannot be undone and will permanently delete all associated data including properties, scenarios, and financial projections.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteConfirm}
                className="bg-red-300/70 hover:bg-red-300 text-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
