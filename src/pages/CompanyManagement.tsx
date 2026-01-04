import React, { useState, useEffect } from 'react';
import {
  Building2Icon,
  UsersIcon,
  PlusIcon,
  AlertTriangleIcon,
  PaletteIcon,
  ToggleLeftIcon,
  ImageIcon,
  CheckIcon,
  Loader2Icon,
} from 'lucide-react';
import { LeftRail } from '../components/LeftRail';
import { useCompany, TeamMember } from '@/contexts/CompanyContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export const CompanyManagement = () => {
  const {
    company,
    teamMembers,
    seatLimit,
    activeSeats,
    canAddStaff,
    loading: companyLoading,
    inviteAgent,
    updateCompanyBranding,
  } = useCompany();
  
  const { branding, updateBranding, loading: brandingLoading } = useBranding();
  const { toast } = useToast();

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

  // Branding form state
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#6366f1');
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingChanged, setBrandingChanged] = useState(false);

  // Client interactivity state
  const [isClientInteractive, setIsClientInteractive] = useState(true);
  const [savingInteractivity, setSavingInteractivity] = useState(false);

  // Initialize form values from branding context
  useEffect(() => {
    if (branding) {
      setCompanyName(branding.companyName || '');
      setLogoUrl(branding.logoUrl || '');
      setPrimaryColor(branding.primaryColor || '#3b82f6');
      setSecondaryColor(branding.secondaryColor || '#6366f1');
      setIsClientInteractive(branding.isClientInteractiveEnabled);
    }
  }, [branding]);

  // Track if branding has changed
  useEffect(() => {
    if (branding) {
      const hasChanged =
        companyName !== branding.companyName ||
        logoUrl !== (branding.logoUrl || '') ||
        primaryColor !== branding.primaryColor ||
        secondaryColor !== branding.secondaryColor;
      setBrandingChanged(hasChanged);
    }
  }, [companyName, logoUrl, primaryColor, secondaryColor, branding]);

  const seatUsagePercent = seatLimit > 0 ? (activeSeats / seatLimit) * 100 : 0;
  const isNearLimit = seatUsagePercent >= 80;
  const isAtLimit = activeSeats >= seatLimit;

  const handleInviteClick = () => {
    if (!canAddStaff) {
      toast({
        title: 'Seat limit reached',
        description: 'Please upgrade your plan to add more staff.',
        variant: 'destructive',
      });
      return;
    }
    setInviteDialogOpen(true);
  };

  const handleInviteSubmit = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide both name and email.',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    const result = await inviteAgent(inviteEmail.trim(), inviteName.trim());
    setInviting(false);

    if (result.success) {
      toast({
        title: 'Agent invited',
        description: `${inviteName} has been invited to join your team.`,
      });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteName('');
    } else {
      toast({
        title: 'Failed to invite agent',
        description: result.error || 'An error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    
    const result = await updateBranding({
      companyName,
      logoUrl: logoUrl || null,
      primaryColor,
      secondaryColor,
    });

    setSavingBranding(false);

    if (result.success) {
      toast({
        title: 'Branding updated',
        description: 'Your company branding has been saved.',
      });
      setBrandingChanged(false);
    } else {
      toast({
        title: 'Failed to update branding',
        description: result.error || 'An error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleInteractivityToggle = async (enabled: boolean) => {
    setSavingInteractivity(true);
    setIsClientInteractive(enabled);

    const result = await updateBranding({
      isClientInteractiveEnabled: enabled,
    });

    setSavingInteractivity(false);

    if (result.success) {
      toast({
        title: enabled ? 'Client interactivity enabled' : 'Client interactivity disabled',
        description: enabled
          ? 'Clients can now interact with the input drawer.'
          : 'Clients will have view-only access.',
      });
    } else {
      // Revert on failure
      setIsClientInteractive(!enabled);
      toast({
        title: 'Failed to update setting',
        description: result.error || 'An error occurred.',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'agent':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const loading = companyLoading || brandingLoading;

  return (
    <div className="main-app flex h-screen w-full bg-[#f9fafb]">
      <LeftRail />
      <div className="flex-1 ml-16 overflow-hidden py-4 pr-4">
        <div className="bg-white rounded-lg h-full overflow-auto shadow-sm">
          <div className="flex-1 overflow-auto p-8 bg-white">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Building2Icon size={20} className="text-gray-600" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-[#111827]">Company Management</h1>
                <p className="text-sm text-[#6b7280]">
                  Manage your team, branding, and client portal settings
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2Icon className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Section A: Team Management */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <UsersIcon size={18} className="text-gray-500" />
                      <h2 className="text-lg font-medium text-[#111827]">Team Management</h2>
                    </div>
                    <button
                      onClick={handleInviteClick}
                      disabled={!canAddStaff}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                        canAddStaff
                          ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <PlusIcon size={16} />
                      <span>Invite Agent</span>
                    </button>
                  </div>

                  {/* Seat Usage Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="col-span-2 bg-white rounded-lg p-5 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-medium text-[#111827]">Seat Usage</h3>
                          <p className="text-xs text-[#6b7280]">{company?.name || 'Your Company'}</p>
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
                          <span>Seat limit reached. Upgrade your plan to add more staff.</span>
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

                  {/* Team Members Table */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {teamMembers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40">
                        <UsersIcon size={40} className="text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">No team members yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Invite agents to start building your team
                        </p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100 text-left bg-gray-50">
                            <th className="px-5 py-3 text-xs font-medium text-[#6b7280]">Member</th>
                            <th className="px-5 py-3 text-xs font-medium text-[#6b7280]">Role</th>
                            <th className="px-5 py-3 text-xs font-medium text-[#6b7280]">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamMembers.map((member) => {
                            const initials = member.full_name
                              ? member.full_name
                                  .split(' ')
                                  .map((word) => word[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)
                              : 'U';

                            return (
                              <tr key={member.id} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-5 py-4">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-xs font-medium mr-3">
                                      {initials}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-[#111827]">
                                        {member.full_name || 'Unnamed User'}
                                      </div>
                                      {member.email && (
                                        <div className="text-xs text-[#6b7280]">{member.email}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(
                                      member.role
                                    )}`}
                                  >
                                    {member.role}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-sm text-[#374151]">
                                  {new Date(member.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>

                {/* Section B: Branding */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <PaletteIcon size={18} className="text-gray-500" />
                    <h2 className="text-lg font-medium text-[#111827]">Branding</h2>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Company Name */}
                      <div className="space-y-2">
                        <Label htmlFor="company-name" className="text-sm font-medium text-gray-700">
                          Company Name
                        </Label>
                        <Input
                          id="company-name"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Enter company name"
                          className="h-10"
                        />
                      </div>

                      {/* Logo URL */}
                      <div className="space-y-2">
                        <Label htmlFor="logo-url" className="text-sm font-medium text-gray-700">
                          Logo URL
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="logo-url"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            placeholder="https://example.com/logo.png"
                            className="h-10 flex-1"
                          />
                          {logoUrl && (
                            <div className="w-10 h-10 rounded border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                              <img
                                src={logoUrl}
                                alt="Logo preview"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          {!logoUrl && (
                            <div className="w-10 h-10 rounded border border-gray-200 flex items-center justify-center bg-gray-50">
                              <ImageIcon size={16} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Primary Color */}
                      <div className="space-y-2">
                        <Label htmlFor="primary-color" className="text-sm font-medium text-gray-700">
                          Primary Color
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative">
                            <input
                              type="color"
                              id="primary-color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            placeholder="#3b82f6"
                            className="h-10 flex-1 font-mono text-sm"
                            maxLength={7}
                          />
                        </div>
                      </div>

                      {/* Secondary Color */}
                      <div className="space-y-2">
                        <Label htmlFor="secondary-color" className="text-sm font-medium text-gray-700">
                          Secondary Color
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative">
                            <input
                              type="color"
                              id="secondary-color"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            placeholder="#6366f1"
                            className="h-10 flex-1 font-mono text-sm"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Color Preview */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-3">Preview</p>
                      <div className="flex gap-3">
                        <div
                          className="w-20 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Primary
                        </div>
                        <div
                          className="w-20 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: secondaryColor }}
                        >
                          Secondary
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="mt-6 flex justify-end">
                      <Button
                        onClick={handleSaveBranding}
                        disabled={!brandingChanged || savingBranding}
                        className="flex items-center gap-2"
                      >
                        {savingBranding ? (
                          <>
                            <Loader2Icon size={16} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckIcon size={16} />
                            Save Branding
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Section C: Client Portal Settings */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <ToggleLeftIcon size={18} className="text-gray-500" />
                    <h2 className="text-lg font-medium text-[#111827]">Client Portal Settings</h2>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-[#111827]">Enable Client Interactivity</h3>
                        <p className="text-xs text-[#6b7280] mt-1">
                          When enabled, clients can interact with the input drawer to explore different scenarios.
                          When disabled, clients have view-only access to the shared scenario.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {savingInteractivity && (
                          <Loader2Icon size={16} className="animate-spin text-gray-400" />
                        )}
                        <Switch
                          checked={isClientInteractive}
                          onCheckedChange={handleInteractivityToggle}
                          disabled={savingInteractivity}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Agent Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Agent</DialogTitle>
            <DialogDescription>
              Add a new agent to your team. They will receive an email invitation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-name">Full Name</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Enter agent's full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="agent@example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !inviting) {
                    handleInviteSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteSubmit} disabled={inviting}>
              {inviting ? 'Inviting...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

