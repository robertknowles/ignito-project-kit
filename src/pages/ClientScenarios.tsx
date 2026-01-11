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
  XCircle,
  Copy,
  User,
  FileText,
  Eye,
  Download,
} from 'lucide-react'
import { PropertyTimeline } from '../components/PropertyTimeline'
import { LeftRail } from '../components/LeftRail'
import { ClientCreationForm } from '../components/ClientCreationForm'
import { PDFReportRenderer } from '../components/PDFReportRenderer'
import { ClientProfileModal } from '../components/ClientProfileModal'
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

// Track client status for CRM display
interface ClientStatus {
  hasOnboardingId: boolean;
  isQuestionnaireCompleted: boolean;
  hasScenario: boolean;
  hasBeenViewed: boolean;
  clientViewedAt: string | null;
  onboardingId: string | null;
  scenarioId: number | null;
  shareId: string | null;
  investmentProfile: any | null;
  communicationLog: any[] | null;
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
  
  // Track client status for CRM display
  const [clientStatuses, setClientStatuses] = useState<Record<number, ClientStatus>>({});
  
  // State for profile modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileClient, setProfileClient] = useState<Client | null>(null);

  // Fetch comprehensive client status for all clients
  useEffect(() => {
    const fetchClientStatuses = async () => {
      if (clients.length === 0) return;

      try {
        const clientIds = clients.map(c => c.id);
        const { data: scenarios, error } = await supabase
          .from('scenarios')
          .select('id, client_id, onboarding_id, share_id, data')
          .in('client_id', clientIds);

        if (error) throw error;

        const statusMap: Record<number, ClientStatus> = {};
        
        // Initialize all clients with default status
        clients.forEach(client => {
          statusMap[client.id] = {
            hasOnboardingId: false,
            isQuestionnaireCompleted: false,
            hasScenario: false,
            hasBeenViewed: false,
            clientViewedAt: null,
            onboardingId: null,
            scenarioId: null,
            shareId: null,
            investmentProfile: null,
            communicationLog: null,
          };
        });

        // Update with actual data from scenarios
        scenarios?.forEach(scenario => {
          const data = scenario.data as any;
          const hasProperties = data?.propertySelections && Object.keys(data.propertySelections).length > 0;
          
          statusMap[scenario.client_id] = {
            hasOnboardingId: !!scenario.onboarding_id,
            isQuestionnaireCompleted: data?.onboardingCompleted === true,
            hasScenario: hasProperties,
            hasBeenViewed: !!data?.clientViewedAt,
            clientViewedAt: data?.clientViewedAt || null,
            onboardingId: scenario.onboarding_id,
            scenarioId: scenario.id,
            shareId: scenario.share_id,
            investmentProfile: data?.investmentProfile || null,
            communicationLog: data?.communicationLog || null,
          };
        });

        setClientStatuses(statusMap);
      } catch (error) {
        console.error('Error fetching client statuses:', error);
      }
    };

    fetchClientStatuses();
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
      setClientStatuses(prev => ({
        ...prev,
        [client.id]: {
          ...prev[client.id],
          hasOnboardingId: true,
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

  // Copy onboarding link to clipboard
  const handleCopyOnboardingLink = async (client: Client) => {
    const status = clientStatuses[client.id];
    
    if (status?.onboardingId) {
      const onboardingUrl = `${window.location.origin}/onboarding/${status.onboardingId}`;
      await navigator.clipboard.writeText(onboardingUrl);
      toast.success('Questionnaire link copied!');
    } else {
      // Generate new link if none exists
      await handleGenerateOnboardingLink(client);
    }
  };

  // Open profile modal for a client
  const handleOpenProfile = (client: Client) => {
    setProfileClient(client);
    setProfileModalOpen(true);
  };

  // Status badge component
  const StatusBadge = ({ 
    isComplete, 
    label, 
    tooltip 
  }: { 
    isComplete: boolean; 
    label: string; 
    tooltip: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
          isComplete 
            ? 'bg-green-50 text-green-700' 
            : 'bg-gray-50 text-gray-500'
        }`}>
          {isComplete ? (
            <CheckCircle2 size={12} className="text-green-600" />
          ) : (
            <XCircle size={12} className="text-gray-400" />
          )}
          <span>{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );

  // Get status badges for a client
  const getStatusBadges = (client: Client) => {
    const status = clientStatuses[client.id];
    
    return (
      <div className="flex items-center gap-2">
        <StatusBadge 
          isComplete={status?.isQuestionnaireCompleted || false}
          label="Quest"
          tooltip={status?.isQuestionnaireCompleted 
            ? "Questionnaire completed" 
            : "Questionnaire not completed"}
        />
        <StatusBadge 
          isComplete={status?.hasScenario || false}
          label="Scenario"
          tooltip={status?.hasScenario 
            ? "Investment scenario created" 
            : "No scenario created yet"}
        />
        <StatusBadge 
          isComplete={status?.hasBeenViewed || false}
          label="Viewed"
          tooltip={status?.hasBeenViewed 
            ? `Report viewed on ${new Date(status.clientViewedAt!).toLocaleDateString()}` 
            : status?.shareId 
              ? "Report shared but not yet viewed" 
              : "Report not shared yet"}
        />
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="main-app flex h-screen w-full bg-[#f9fafb]">
        <LeftRail />
        <div className="flex-1 ml-16 overflow-hidden">
          <div className="bg-white h-full overflow-auto">
            <div className="flex-1 overflow-auto p-8 bg-white">
              {/* Client Portfolio with Stats Header */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-[#111827]">
                  Client Scenarios
                </h2>
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
              <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                {/* Stats Row - Seat Usage + Stats Cards */}
                <div className="grid grid-cols-3 border-b border-gray-200">
                  {/* Seat Usage Card */}
                  <div className="bg-white p-5 border-r border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-[#111827]">Seat Usage</h3>
                        <p className="text-xs text-[#6b7280]">Client seats used</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-semibold text-[#111827]">
                          {activeSeats} <span className="text-base font-normal text-[#6b7280]">of {seatLimit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
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
                      <div className="flex items-center gap-2 text-red-600 text-xs mt-2">
                        <AlertTriangleIcon size={14} />
                        <span>Seat limit reached</span>
                      </div>
                    )}
                    {isNearLimit && !isAtLimit && (
                      <div className="flex items-center gap-2 text-amber-600 text-xs mt-2">
                        <AlertTriangleIcon size={14} />
                        <span>Approaching limit</span>
                      </div>
                    )}
                  </div>

                  {/* Scenarios Created */}
                  <div className="bg-white p-5 border-r border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-[#111827]">Scenario Coverage</h3>
                        <p className="text-xs text-[#6b7280]">Clients with active plans</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-semibold text-[#111827]">
                          {stats.activeScenarios} <span className="text-base font-normal text-[#6b7280]">of {stats.totalClients}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all bg-[#3b82f6]"
                        style={{ width: `${stats.totalClients > 0 ? Math.min((stats.activeScenarios / stats.totalClients) * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Purchasing Soon */}
                  <div className="bg-white p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-[#111827]">Purchasing Soon</h3>
                        <p className="text-xs text-[#6b7280]">Clients buying by 2027</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-semibold text-[#111827]">
                          {stats.purchasingSoon} <span className="text-base font-normal text-[#6b7280]">of {stats.totalClients}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all bg-[#10b981]"
                        style={{ width: `${stats.totalClients > 0 ? Math.min((stats.purchasingSoon / stats.totalClients) * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Client Portfolio Table */}
                <div className="bg-white">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#f3f4f6] text-left">
                        <th className="px-6 py-3 text-xs font-medium text-[#6b7280]">
                          Client
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-[#6b7280]">
                          Status
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
                          <tr key={client.id} className="border-b border-[#f3f4f6] hover:bg-gray-50/50 transition-colors">
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
                            <td className="px-6 py-4">
                              {getStatusBadges(client)}
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
                              <div className="flex items-center gap-1">
                                {/* Profile Button */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button 
                                      onClick={() => handleOpenProfile(client)}
                                      className="p-1.5 text-[#6b7280] hover:text-[#3b82f6] hover:bg-blue-50 rounded transition-colors"
                                    >
                                      <User size={16} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View Profile</p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* Copy Questionnaire Link */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button 
                                      onClick={() => handleCopyOnboardingLink(client)}
                                      className="p-1.5 text-[#6b7280] hover:text-[#3b82f6] hover:bg-blue-50 rounded transition-colors"
                                    >
                                      <Copy size={16} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Copy questionnaire link</p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* View Scenario */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button 
                                      onClick={() => handleViewClient(client.id)}
                                      className="p-1.5 text-[#6b7280] hover:text-[#3b82f6] hover:bg-blue-50 rounded transition-colors"
                                    >
                                      <FileText size={16} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View Scenario</p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* Download PDF */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button 
                                      onClick={() => handleGeneratePDF(client)}
                                      disabled={pdfGenerating}
                                      className="p-1.5 text-[#6b7280] hover:text-[#3b82f6] hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Download size={16} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{pdfGenerating ? 'Generating...' : 'Download PDF'}</p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* More Options Dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1.5 text-[#6b7280] hover:text-[#374151] hover:bg-gray-100 rounded transition-colors">
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
              {/* Upcoming Purchases */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-medium text-[#111827]">
                    Upcoming Purchases
                  </h2>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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

        {/* Client Profile Modal */}
        <ClientProfileModal
          isOpen={profileModalOpen}
          onClose={() => {
            setProfileModalOpen(false);
            setProfileClient(null);
          }}
          client={profileClient}
          clientStatus={profileClient ? clientStatuses[profileClient.id] : null}
          onStatusChange={() => {
            // Refresh client statuses when notes are added
            const fetchClientStatuses = async () => {
              if (clients.length === 0) return;
              try {
                const clientIds = clients.map(c => c.id);
                const { data: scenarios, error } = await supabase
                  .from('scenarios')
                  .select('id, client_id, onboarding_id, share_id, data')
                  .in('client_id', clientIds);

                if (error) throw error;

                const statusMap: Record<number, ClientStatus> = {};
                clients.forEach(client => {
                  statusMap[client.id] = {
                    hasOnboardingId: false,
                    isQuestionnaireCompleted: false,
                    hasScenario: false,
                    hasBeenViewed: false,
                    clientViewedAt: null,
                    onboardingId: null,
                    scenarioId: null,
                    shareId: null,
                    investmentProfile: null,
                    communicationLog: null,
                  };
                });

                scenarios?.forEach(scenario => {
                  const data = scenario.data as any;
                  const hasProperties = data?.propertySelections && Object.keys(data.propertySelections).length > 0;
                  
                  statusMap[scenario.client_id] = {
                    hasOnboardingId: !!scenario.onboarding_id,
                    isQuestionnaireCompleted: data?.onboardingCompleted === true,
                    hasScenario: hasProperties,
                    hasBeenViewed: !!data?.clientViewedAt,
                    clientViewedAt: data?.clientViewedAt || null,
                    onboardingId: scenario.onboarding_id,
                    scenarioId: scenario.id,
                    shareId: scenario.share_id,
                    investmentProfile: data?.investmentProfile || null,
                    communicationLog: data?.communicationLog || null,
                  };
                });

                setClientStatuses(statusMap);
              } catch (error) {
                console.error('Error refreshing client statuses:', error);
              }
            };
            fetchClientStatuses();
          }}
        />
      </div>
    </TooltipProvider>
  )
}
