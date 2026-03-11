import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  SearchIcon,
  PlusIcon,
  MoreHorizontalIcon,
  CalendarIcon,
  Edit2Icon,
  Trash2Icon,
  AlertTriangleIcon,
  Copy,
  User,
  Download,
  Send,
  UserPlus,
  Target,
  FileSpreadsheet,
  Activity,
} from 'lucide-react'
import { TourStep } from '@/components/TourManager'
import { PropertyTimeline } from '../components/PropertyTimeline'
import { LeftRail } from '../components/LeftRail'
import { ClientCreationForm } from '../components/ClientCreationForm'
import { PDFReportRenderer } from '../components/PDFReportRenderer'
import { ClientProfileModal } from '../components/ClientProfileModal'
import { PropertyBlocksOnboardingModal } from '../components/PropertyBlocksOnboardingModal'
import { PropertyOnboardingWarningBanner } from '../components/PropertyOnboardingWarningBanner'
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
import { UnderlineTabBar } from '@/components/UnderlineTabBar'
import { StatCard } from '@/components/StatCard'
import { StatusBadge as StatusBadgePill } from '@/components/StatusBadge'

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

// Storage key for tracking if user dismissed the warning banner this session
const ONBOARDING_BANNER_DISMISSED_KEY = 'ignito_property_onboarding_banner_dismissed';

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
  const { companyId, user } = useAuth();
  
  // Property onboarding state
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [hasCompletedPropertyOnboarding, setHasCompletedPropertyOnboarding] = useState<boolean | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  
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

  // CRM filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'review_cycle' | 'onboarding' | 'ready'>('all');

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
}
    };

    fetchClientStatuses();
  }, [clients]);

  // Fetch property onboarding status on mount
  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      if (!user) {
        setOnboardingLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_completed_property_onboarding')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          const completed = data.has_completed_property_onboarding ?? false;
          setHasCompletedPropertyOnboarding(completed);
          // Don't auto-show the modal - just let the yellow warning banner show
          // Users can click "Configure Now" on the banner to open the modal
        }
      } catch (error) {
}
      setOnboardingLoading(false);
    };
    
    fetchOnboardingStatus();
    
    // Check if banner was dismissed this session
    const dismissed = sessionStorage.getItem(ONBOARDING_BANNER_DISMISSED_KEY) === 'true';
    setBannerDismissed(dismissed);
  }, [user]);

  // Handle completing the property onboarding
  const handleOnboardingComplete = async () => {
    setShowOnboardingModal(false);
    setHasCompletedPropertyOnboarding(true);
    
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ has_completed_property_onboarding: true })
          .eq('id', user.id);
      } catch (error) {
}
    }
  };
  
  // Handle skipping the property onboarding
  const handleOnboardingSkip = () => {
    setShowOnboardingModal(false);
    // Don't mark as completed - just close the modal
    // Banner will show since hasCompletedPropertyOnboarding is still false
  };
  
  // Handle dismissing the warning banner
  const handleBannerDismiss = () => {
    setBannerDismissed(true);
    sessionStorage.setItem(ONBOARDING_BANNER_DISMISSED_KEY, 'true');
  };
  
  // Handle clicking "Configure Now" on the banner
  const handleConfigureNow = () => {
    setShowOnboardingModal(true);
  };
  
  // Determine if we should show the warning banner
  // Show banner if onboarding is NOT completed (false or null) - this covers:
  // 1. New users who skipped the modal
  // 2. Existing users who created accounts before this feature
  // 3. Users returning after previously skipping
  const showWarningBanner = !onboardingLoading && 
    hasCompletedPropertyOnboarding !== true && 
    !showOnboardingModal && 
    !bannerDismissed;

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

  // --- CRM helpers ---

  // Format relative time for "Last Active" column
  const formatRelativeTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  };

  // Format review date with countdown
  const formatReviewDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return { text: '--', badge: null, color: 'text-[#6b7280]' };
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / 86400000);
    const formatted = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    if (days < 0) return { text: formatted, badge: 'Overdue', color: 'text-red-600' };
    if (days <= 14) return { text: formatted, badge: `${days}d`, color: 'text-amber-600' };
    if (days <= 30) return { text: formatted, badge: `${days}d`, color: 'text-[#374151]' };
    return { text: formatted, badge: null, color: 'text-[#374151]' };
  };

  // Status badge configs
  const stageBadgeConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    onboarding: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Onboarding' },
    review: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Review' },
  };

  const portalBadgeConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    not_invited: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Not invited' },
    invited: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Invited' },
    active: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Active' },
  };

  const roadmapBadgeConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    not_started: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Not started' },
    draft: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Draft' },
    in_review: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'In review' },
    finalised: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Finalised' },
  };

  // Map status values to StatusBadge variants
  const stageVariantMap: Record<string, 'blue' | 'green' | 'gray'> = {
    onboarding: 'blue', review: 'green',
  };
  const portalVariantMap: Record<string, 'blue' | 'green' | 'gray' | 'amber'> = {
    not_invited: 'gray', invited: 'amber', active: 'green',
  };
  const roadmapVariantMap: Record<string, 'blue' | 'green' | 'gray' | 'amber'> = {
    not_started: 'gray', draft: 'blue', in_review: 'amber', finalised: 'green',
  };

  // Filter tabs with counts
  const filterTabs = useMemo(() => {
    const counts = {
      all: clients.length,
      review_cycle: clients.filter(c => c.stage === 'review').length,
      onboarding: clients.filter(c => c.stage === 'onboarding').length,
      ready: clients.filter(c => c.roadmap_status === 'finalised').length,
    };
    return [
      { key: 'all' as const, label: 'All', count: counts.all },
      { key: 'review_cycle' as const, label: 'Review cycle', count: counts.review_cycle },
      { key: 'onboarding' as const, label: 'Onboarding', count: counts.onboarding },
      { key: 'ready' as const, label: 'Ready', count: counts.ready },
    ];
  }, [clients]);

  // Filtered + searched clients
  const filteredClients = useMemo(() => {
    let result = clients;

    // Apply tab filter
    if (activeFilter === 'review_cycle') {
      result = result.filter(c => c.stage === 'review');
    } else if (activeFilter === 'onboarding') {
      result = result.filter(c => c.stage === 'onboarding');
    } else if (activeFilter === 'ready') {
      result = result.filter(c => c.roadmap_status === 'finalised');
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
      );
    }

    return result;
  }, [clients, activeFilter, searchQuery]);

  // CSV export
  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Stage', 'Portal Status', 'Roadmap Status', 'Last Active', 'Review Date'];
    const rows = filteredClients.map(client => [
      client.name,
      client.email || '',
      client.phone || '',
      client.stage || 'onboarding',
      client.portal_status || 'not_invited',
      client.roadmap_status || 'not_started',
      client.last_active_at || '',
      client.next_review_date || '',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Client data exported!');
  };

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
toast.error('Failed to generate onboarding link');
    }
  };

  // Copy onboarding link to clipboard
  const handleCopyOnboardingLink = async (client: Client) => {
try {
      const status = clientStatuses[client.id];
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

  return (
    <TooltipProvider>
      {/* Property Blocks Onboarding Modal */}
      <PropertyBlocksOnboardingModal
        isOpen={showOnboardingModal}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
      
      <div className="main-app flex h-screen w-full bg-[#f9fafb]">
        <LeftRail />
        <div className="flex-1 ml-16 overflow-hidden flex flex-col">
          {/* Warning Banner - shows if user hasn't completed property onboarding */}
          {showWarningBanner && (
            <PropertyOnboardingWarningBanner
              onConfigureNow={handleConfigureNow}
              onDismiss={handleBannerDismiss}
            />
          )}
          <div className="flex-1 overflow-auto">
            <div className="flex-1 overflow-auto p-8">
              {/* Client CRM Header */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-[#111827]">
                  Clients
                </h2>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-[#f3f4f6] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] w-64"
                    />
                    <SearchIcon
                      size={16}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6b7280]"
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3 py-2 border border-[#f3f4f6] rounded-lg text-sm text-[#374151] hover:bg-gray-50 transition-colors"
                      >
                        <FileSpreadsheet size={16} className="text-[#6b7280]" />
                        <span>Export</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export clients to CSV</p>
                    </TooltipContent>
                  </Tooltip>
                  <TourStep
                    id="clients-new-client"
                    title="Add a New Client"
                    content="Click here to create a new client. You'll enter their basic details and financial information to get started with their property investment journey."
                    order={1}
                    position="bottom"
                  >
                    <button
                      onClick={() => setCreateFormOpen(true)}
                      className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1d4ed8] transition-colors"
                    >
                      <PlusIcon size={16} />
                      <span>New Client</span>
                    </button>
                  </TourStep>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="mb-4">
                <UnderlineTabBar
                  tabs={filterTabs}
                  activeKey={activeFilter}
                  onChange={(key) => setActiveFilter(key as typeof activeFilter)}
                />
              </div>
              <div className="mb-8">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <StatCard label="Seat Usage" value={activeSeats} subtitle={`/ ${seatLimit}`} />
                  <StatCard label="Scenario Coverage" value={stats.activeScenarios} subtitle={`/ ${stats.totalClients}`} />
                  <StatCard label="Purchasing Soon" value={stats.purchasingSoon} subtitle={`/ ${stats.totalClients}`} />
                </div>

                {/* Client Portfolio Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="px-6 py-3 table-header">Client</th>
                        <th className="px-4 py-3 table-header">Stage</th>
                        <th className="px-4 py-3 table-header">Portal</th>
                        <th className="px-4 py-3 table-header">Roadmap</th>
                        <th className="px-4 py-3 table-header">Last Active</th>
                        <th className="px-4 py-3 table-header">Review Date</th>
                        <th className="px-4 py-3 table-header"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <div className="text-sm text-[#6b7280]">
                              {searchQuery ? 'No clients match your search' : 'No clients in this category'}
                            </div>
                          </td>
                        </tr>
                      ) : filteredClients.map((client, clientIndex) => {
                        const initials = client.name
                          .split(' ')
                          .map(word => word[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);

                        const status = clientStatuses[client.id];
                        const isOnboarded = status?.isQuestionnaireCompleted || false;
                        const hasPlan = status?.hasScenario || false;
                        const hasClientUser = !!status?.clientUserId;
                        const hasLoggedIn = status?.clientHasLoggedIn || false;
                        const isFirstRow = clientIndex === 0;
                        const reviewInfo = formatReviewDate(client.next_review_date);

                        return (
                          <tr key={client.id} className="border-b border-[#f3f4f6] hover:bg-gray-50/50 transition-colors">
                            {/* Client name + email */}
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <button
                                  onClick={() => handleOpenProfile(client)}
                                  className="w-8 h-8 rounded-full bg-[#2563EB] bg-opacity-60 flex items-center justify-center text-white text-sm mr-3 hover:bg-opacity-80 transition-colors flex-shrink-0"
                                >
                                  {initials}
                                </button>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-[#111827] truncate">
                                    {client.name}
                                  </div>
                                  {client.email && (
                                    <div className="text-xs text-[#6b7280] truncate">
                                      {client.email}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Stage */}
                            <td className="px-4 py-4">
                              <StatusBadgePill
                                label={stageBadgeConfig[client.stage || 'onboarding']?.label || 'Onboarding'}
                                variant={stageVariantMap[client.stage || 'onboarding'] || 'blue'}
                              />
                            </td>

                            {/* Portal Status */}
                            <td className="px-4 py-4">
                              <StatusBadgePill
                                label={portalBadgeConfig[client.portal_status || 'not_invited']?.label || 'Not invited'}
                                variant={portalVariantMap[client.portal_status || 'not_invited'] || 'gray'}
                              />
                            </td>

                            {/* Roadmap Status */}
                            <td className="px-4 py-4">
                              <StatusBadgePill
                                label={roadmapBadgeConfig[client.roadmap_status || 'not_started']?.label || 'Not started'}
                                variant={roadmapVariantMap[client.roadmap_status || 'not_started'] || 'gray'}
                              />
                            </td>

                            {/* Last Active */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1.5">
                                {client.last_active_at && (
                                  <Activity size={12} className="text-[#9ca3af]" />
                                )}
                                <span className="text-sm text-[#374151]">
                                  {formatRelativeTime(client.last_active_at)}
                                </span>
                              </div>
                            </td>

                            {/* Review Date */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm ${reviewInfo.color}`}>
                                  {reviewInfo.text}
                                </span>
                                {reviewInfo.badge && (
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    reviewInfo.badge === 'Overdue'
                                      ? 'bg-red-50 text-red-600'
                                      : 'bg-amber-50 text-amber-600'
                                  }`}>
                                    {reviewInfo.badge}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1">
                                {/* Profile Button */}
                                {isFirstRow ? (
                                  <TourStep
                                    id="clients-view-profile"
                                    title="View Client Profile"
                                    content="Access detailed client information including financial details, goals, and questionnaire responses. Keep client data organized and up-to-date."
                                    order={6}
                                    position="left"
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => handleOpenProfile(client)}
                                          className="p-1.5 text-[#6b7280] hover:text-[#2563EB] hover:bg-blue-50 rounded transition-colors"
                                        >
                                          <User size={16} />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View Profile</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TourStep>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleOpenProfile(client)}
                                        className="p-1.5 text-[#6b7280] hover:text-[#2563EB] hover:bg-blue-50 rounded transition-colors"
                                      >
                                        <User size={16} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View Profile</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}

                                {/* Download PDF */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleGeneratePDF(client)}
                                      disabled={pdfGenerating}
                                      className="p-1.5 text-[#6b7280] hover:text-[#2563EB] hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                  <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuItem
                                      onClick={() => handleViewClient(client.id)}
                                      className="cursor-pointer"
                                    >
                                      <Target size={14} className="mr-2" />
                                      {hasPlan ? 'View Plan' : 'Create Plan'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleCopyOnboardingLink(client)}
                                      className="cursor-pointer"
                                    >
                                      <UserPlus size={14} className="mr-2" />
                                      {isOnboarded ? 'Copy Questionnaire Link' : 'Send Questionnaire'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleInviteClient(client)}
                                      className="cursor-pointer"
                                    >
                                      <Send size={14} className="mr-2" />
                                      {hasLoggedIn ? 'View Credentials' : hasClientUser ? 'Resend Invite' : 'Invite to Portal'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
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
              <TourStep
                id="clients-upcoming-purchases"
                title="Upcoming Purchases Chart"
                content="Visualize all your clients' planned property purchases on a timeline. See who's buying when, track purchase dates across your entire portfolio, and identify busy periods."
                order={7}
                position="top"
              >
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
              </TourStep>
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
