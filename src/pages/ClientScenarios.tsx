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
  Share2,
  Send,
  ClipboardList,
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
  // Client dashboard invite status
  clientUserId: string | null;
  clientHasLoggedIn: boolean;
  clientEmail: string | null;
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

  // State for client invite modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteCredentials, setInviteCredentials] = useState<{
    email: string;
    password: string;
    loginUrl: string;
    clientName: string;
  } | null>(null);

  // State for email prompt dialog
  const [emailPromptOpen, setEmailPromptOpen] = useState(false);
  const [emailPromptClient, setEmailPromptClient] = useState<Client | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');

  // Fetch comprehensive client status for all clients
  useEffect(() => {
    const fetchClientStatuses = async () => {
      if (clients.length === 0) return;

      try {
        const clientIds = clients.map(c => c.id);
        const { data: scenarios, error } = await supabase
          .from('scenarios')
          .select('id, client_id, onboarding_id, share_id, client_user_id, data')
          .in('client_id', clientIds);

        if (error) throw error;

        // Get client user IDs to check login status
        const clientUserIds = scenarios
          ?.filter(s => s.client_user_id)
          .map(s => s.client_user_id) || [];

        // Fetch profiles to check if client users have logged in (have updated_at after created_at)
        let clientUserProfiles: Record<string, { hasLoggedIn: boolean }> = {};
        if (clientUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, created_at, updated_at')
            .in('id', clientUserIds);
          
          profiles?.forEach(profile => {
            // Consider logged in if updated_at is different from created_at (they've accessed the app)
            const hasLoggedIn = profile.updated_at && profile.updated_at !== profile.created_at;
            clientUserProfiles[profile.id] = { hasLoggedIn: !!hasLoggedIn };
          });
        }

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
            clientUserId: null,
            clientHasLoggedIn: false,
            clientEmail: client.email || null,
          };
        });

        // Update with actual data from scenarios
        scenarios?.forEach(scenario => {
          const data = scenario.data as any;
          const hasProperties = data?.propertySelections && Object.keys(data.propertySelections).length > 0;
          const clientUserId = scenario.client_user_id;
          const hasLoggedIn = clientUserId ? clientUserProfiles[clientUserId]?.hasLoggedIn || false : false;
          
          // Find the client to get their email
          const client = clients.find(c => c.id === scenario.client_id);
          
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
            clientUserId: clientUserId || null,
            clientHasLoggedIn: hasLoggedIn,
            clientEmail: client?.email || null,
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
    console.log('Onboarding button clicked for:', client.name);
    
    try {
      const status = clientStatuses[client.id];
      console.log('Client status:', status);
      
      if (status?.onboardingId) {
        const onboardingUrl = `${window.location.origin}/onboarding/${status.onboardingId}`;
        await navigator.clipboard.writeText(onboardingUrl);
        toast.success('Questionnaire link copied!', {
          description: 'Share this link with your client.',
        });
      } else {
        // Generate new link if none exists
        toast.info('Generating questionnaire link...', {
          description: `Creating link for ${client.name}`,
        });
        await handleGenerateOnboardingLink(client);
      }
    } catch (error) {
      console.error('Error copying onboarding link:', error);
      toast.error('Failed to copy link. Please try again.');
    }
  };

  // Open profile modal for a client
  const handleOpenProfile = (client: Client) => {
    setProfileClient(client);
    setProfileModalOpen(true);
  };

  // Generate a secure temporary password
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const special = '!@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    password += special.charAt(Math.floor(Math.random() * special.length));
    password += Math.floor(Math.random() * 10);
    return password;
  };

  // Handle inviting a client to view their dashboard
  const handleInviteClient = async (client: Client) => {
    const status = clientStatuses[client.id];
    
    // If client already has a user account, show existing credentials modal
    if (status?.clientUserId) {
      // Show modal with existing info (password can't be retrieved, but show email and login URL)
      setInviteCredentials({
        email: status.clientEmail || client.email || 'Unknown',
        password: '(Password was sent previously)',
        loginUrl: `${window.location.origin}/login`,
        clientName: client.name || 'Client',
      });
      setInviteModalOpen(true);
      return;
    }

    // Check if client has email
    const clientEmail = status?.clientEmail || client.email;
    if (!clientEmail) {
      // Show email prompt dialog
      setEmailPromptClient(client);
      setPendingEmail('');
      setEmailPromptOpen(true);
      return;
    }

    // Proceed with creating the client user
    await createClientUser(client, clientEmail);
  };

  // Create client user account and link to scenario
  const createClientUser = async (client: Client, email: string) => {
    try {
      const tempPassword = generateTempPassword();
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: { name: client.name },
        },
      });

      if (authError) {
        console.error('Error creating client user:', authError);
        toast.error(`Failed to create client account: ${authError.message}`);
        return;
      }

      if (!authData.user) {
        toast.error('Failed to create client account');
        return;
      }

      const newUserId = authData.user.id;

      // Update the profile with role='client' and company_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'client',
          company_id: companyId,
          full_name: client.name,
        })
        .eq('id', newUserId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        toast.error('Failed to set up client profile');
        return;
      }

      // Get the scenario for this client and update client_user_id
      const status = clientStatuses[client.id];
      if (status?.scenarioId) {
        const { error: scenarioError } = await supabase
          .from('scenarios')
          .update({ client_user_id: newUserId })
          .eq('id', status.scenarioId);

        if (scenarioError) {
          console.error('Error updating scenario:', scenarioError);
          toast.error('Failed to link client to scenario');
          return;
        }
      } else {
        // No scenario exists yet - create one with the client_user_id
        const { error: insertError } = await supabase
          .from('scenarios')
          .insert({
            name: `${client.name}'s Scenario`,
            client_id: client.id,
            company_id: companyId,
            client_user_id: newUserId,
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
          });

        if (insertError) {
          console.error('Error creating scenario:', insertError);
          toast.error('Failed to create client scenario');
          return;
        }
      }

      // Update local state
      setClientStatuses(prev => ({
        ...prev,
        [client.id]: {
          ...prev[client.id],
          clientUserId: newUserId,
          clientHasLoggedIn: false,
          clientEmail: email,
        },
      }));

      // Show credentials modal
      setInviteCredentials({
        email,
        password: tempPassword,
        loginUrl: `${window.location.origin}/login`,
        clientName: client.name || 'Client',
      });
      setInviteModalOpen(true);

      toast.success('Client dashboard invite created!');
    } catch (error) {
      console.error('Error inviting client:', error);
      toast.error('Failed to create client invite');
    }
  };

  // Handle email prompt submission
  const handleEmailPromptSubmit = async () => {
    if (!emailPromptClient || !pendingEmail.trim()) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(pendingEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Save email to client record
    const success = await updateClient(emailPromptClient.id, { email: pendingEmail.trim() });
    
    if (success) {
      // Update local status
      setClientStatuses(prev => ({
        ...prev,
        [emailPromptClient.id]: {
          ...prev[emailPromptClient.id],
          clientEmail: pendingEmail.trim(),
        },
      }));

      // Close dialog and proceed with invite
      setEmailPromptOpen(false);
      await createClientUser(emailPromptClient, pendingEmail.trim());
      setEmailPromptClient(null);
      setPendingEmail('');
    } else {
      toast.error('Failed to save client email');
    }
  };

  // Workflow cell component - shows status + action button together
  const WorkflowCell = ({ 
    isComplete, 
    isWaiting,
    completeLabel,
    incompleteLabel,
    waitingLabel,
    actionIcon,
    actionLabel,
    onAction,
    disabled
  }: { 
    isComplete: boolean;
    isWaiting?: boolean;
    completeLabel: string;
    incompleteLabel: string;
    waitingLabel?: string;
    actionIcon: React.ReactNode;
    actionLabel: string;
    onAction: () => void;
    disabled?: boolean;
  }) => {
    // Determine status state
    const statusLabel = isComplete ? completeLabel : isWaiting ? (waitingLabel || incompleteLabel) : incompleteLabel;
    const statusColor = isComplete 
      ? 'text-green-600' 
      : isWaiting 
        ? 'text-amber-600' 
        : 'text-gray-400';
    const statusIcon = isComplete 
      ? <CheckCircle2 size={12} className="text-green-600" /> 
      : isWaiting 
        ? <Clock size={12} className="text-amber-500" />
        : <XCircle size={12} className="text-gray-400" />;

    return (
      <div className="flex flex-col items-center gap-1.5">
        {/* Action button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={onAction}
              disabled={disabled}
              className={`p-2 rounded-lg border transition-all ${
                isComplete 
                  ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' 
                  : isWaiting
                    ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {actionIcon}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{actionLabel}</p>
          </TooltipContent>
        </Tooltip>
        {/* Status label */}
        <div className={`flex items-center gap-1 text-[10px] ${statusColor}`}>
          {statusIcon}
          <span className="whitespace-nowrap">{statusLabel}</span>
        </div>
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
                        <th className="px-4 py-3 text-xs font-medium text-[#6b7280] text-center">
                          Onboarding
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-[#6b7280] text-center">
                          Plan
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-[#6b7280] text-center">
                          Dashboard
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-[#6b7280]">
                          Next Purchase
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-[#6b7280]">
                          
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
                        
                        const status = clientStatuses[client.id];
                        const isOnboarded = status?.isQuestionnaireCompleted || false;
                        const hasPlan = status?.hasScenario || false;
                        // Dashboard invite status
                        const hasClientUser = !!status?.clientUserId;
                        const hasLoggedIn = status?.clientHasLoggedIn || false;

                        return (
                          <tr key={client.id} className="border-b border-[#f3f4f6] hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <button 
                                  onClick={() => handleOpenProfile(client)}
                                  className="w-8 h-8 rounded-full bg-[#3b82f6] bg-opacity-60 flex items-center justify-center text-white text-sm mr-3 hover:bg-opacity-80 transition-colors"
                                >
                                  {initials}
                                </button>
                                <div className="text-sm font-medium text-[#111827]">
                                  {client.name}
                                </div>
                              </div>
                            </td>
                            
                            {/* Onboarding Column */}
                            <td className="px-4 py-4">
                              <WorkflowCell
                                isComplete={isOnboarded}
                                completeLabel="Completed"
                                incompleteLabel="Not started"
                                actionIcon={<ClipboardList size={16} />}
                                actionLabel={isOnboarded ? "Copy questionnaire link" : "Send questionnaire"}
                                onAction={() => handleCopyOnboardingLink(client)}
                              />
                            </td>
                            
                            {/* Plan Column */}
                            <td className="px-4 py-4">
                              <WorkflowCell
                                isComplete={hasPlan}
                                completeLabel="Created"
                                incompleteLabel="Not created"
                                actionIcon={<FileText size={16} />}
                                actionLabel={hasPlan ? "View plan" : "Create plan"}
                                onAction={() => handleViewClient(client.id)}
                              />
                            </td>
                            
                            {/* Dashboard Column */}
                            <td className="px-4 py-4">
                              <WorkflowCell
                                isComplete={hasLoggedIn}
                                isWaiting={hasClientUser && !hasLoggedIn}
                                completeLabel="Logged in"
                                incompleteLabel="Not invited"
                                waitingLabel="Invited"
                                actionIcon={<Send size={16} />}
                                actionLabel={hasLoggedIn ? "View credentials" : hasClientUser ? "Resend invite" : "Invite to dashboard"}
                                onAction={() => handleInviteClient(client)}
                              />
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
                            
                            <td className="px-4 py-4">
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
                                      onClick={() => handleOpenProfile(client)}
                                      className="cursor-pointer"
                                    >
                                      <User size={14} className="mr-2" />
                                      View Profile
                                    </DropdownMenuItem>
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
                  .select('id, client_id, onboarding_id, share_id, client_user_id, data')
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
                    clientUserId: null,
                    clientHasLoggedIn: false,
                    clientEmail: client.email || null,
                  };
                });

                scenarios?.forEach(scenario => {
                  const data = scenario.data as any;
                  const hasProperties = data?.propertySelections && Object.keys(data.propertySelections).length > 0;
                  const client = clients.find(c => c.id === scenario.client_id);
                  
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
                    clientUserId: scenario.client_user_id || null,
                    clientHasLoggedIn: false, // Would need to check profile
                    clientEmail: client?.email || null,
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

        {/* Client Invite Credentials Modal */}
        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dashboard Login Credentials</DialogTitle>
              <DialogDescription>
                Share these credentials with {inviteCredentials?.clientName} so they can access their investment dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={inviteCredentials?.email || ''}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteCredentials?.email || '');
                      toast.success('Email copied!');
                    }}
                  >
                    <Copy size={14} />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Temporary Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={inviteCredentials?.password || ''}
                    readOnly
                    className="bg-gray-50 font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteCredentials?.password || '');
                      toast.success('Password copied!');
                    }}
                  >
                    <Copy size={14} />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Login URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={inviteCredentials?.loginUrl || ''}
                    readOnly
                    className="bg-gray-50 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteCredentials?.loginUrl || '');
                      toast.success('Login URL copied!');
                    }}
                  >
                    <Copy size={14} />
                  </Button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">Instructions for your client:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Go to the login URL above</li>
                  <li>Enter email and temporary password</li>
                  <li>View their personalized investment dashboard</li>
                </ol>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  // Copy all credentials to clipboard
                  const text = `Dashboard Login for ${inviteCredentials?.clientName}\n\nEmail: ${inviteCredentials?.email}\nPassword: ${inviteCredentials?.password}\nLogin URL: ${inviteCredentials?.loginUrl}`;
                  navigator.clipboard.writeText(text);
                  toast.success('All credentials copied to clipboard!');
                }}
              >
                Copy All
              </Button>
              <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Prompt Dialog */}
        <Dialog open={emailPromptOpen} onOpenChange={setEmailPromptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Client Email Required</DialogTitle>
              <DialogDescription>
                Enter the email address for {emailPromptClient?.name} to send them dashboard access.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="client-email">Email Address</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={pendingEmail}
                  onChange={(e) => setPendingEmail(e.target.value)}
                  placeholder="client@example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEmailPromptSubmit();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEmailPromptOpen(false);
                setEmailPromptClient(null);
                setPendingEmail('');
              }}>
                Cancel
              </Button>
              <Button onClick={handleEmailPromptSubmit} disabled={!pendingEmail.trim()}>
                Send Invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
