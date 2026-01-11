import React, { useState, useEffect } from 'react';
import {
  Building2Icon,
  UsersIcon,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const CompanyManagement = () => {
  const {
    company,
    teamMembers,
    loading: companyLoading,
    updateCompanyBranding,
    updateMemberRole,
  } = useCompany();
  
  const { branding, updateBranding, loading: brandingLoading } = useBranding();
  const { toast } = useToast();

  // Role update state
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // Branding form state
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6b7280');
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
      setPrimaryColor(branding.primaryColor || '#6b7280');
      setIsClientInteractive(branding.isClientInteractiveEnabled);
    }
  }, [branding]);

  // Track if branding has changed
  useEffect(() => {
    if (branding) {
      const hasChanged =
        companyName !== branding.companyName ||
        logoUrl !== (branding.logoUrl || '') ||
        primaryColor !== branding.primaryColor;
      setBrandingChanged(hasChanged);
    }
  }, [companyName, logoUrl, primaryColor, branding]);

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    
    const result = await updateBranding({
      companyName,
      logoUrl: logoUrl || null,
      primaryColor,
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

  const handleRoleChange = async (memberId: string, newRole: 'owner' | 'agent' | 'other') => {
    setUpdatingRoleId(memberId);
    
    const result = await updateMemberRole(memberId, newRole);
    
    setUpdatingRoleId(null);

    if (result.success) {
      toast({
        title: 'Role updated',
        description: 'Team member role has been updated successfully.',
      });
    } else {
      toast({
        title: 'Failed to update role',
        description: result.error || 'An error occurred.',
        variant: 'destructive',
      });
    }
  };

  const getRoleDisplayName = (role: TeamMember['role']) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'agent':
        return 'Buyers Agent';
      case 'other':
        return 'Other';
      default:
        return role;
    }
  };

  const loading = companyLoading || brandingLoading;

  return (
    <div className="main-app flex h-screen w-full bg-[#f9fafb]">
      <LeftRail />
      <div className="flex-1 ml-16 overflow-hidden">
        <div className="bg-white h-full overflow-auto">
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
                                  <Select
                                    value={member.role}
                                    onValueChange={(value: 'owner' | 'agent' | 'other') => 
                                      handleRoleChange(member.id, value)
                                    }
                                    disabled={updatingRoleId === member.id}
                                  >
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                      {updatingRoleId === member.id ? (
                                        <div className="flex items-center gap-2">
                                          <Loader2Icon size={12} className="animate-spin" />
                                          <span>Updating...</span>
                                        </div>
                                      ) : (
                                        <SelectValue>
                                          {getRoleDisplayName(member.role)}
                                        </SelectValue>
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="owner">Owner</SelectItem>
                                      <SelectItem value="agent">Buyers Agent</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
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
                        <p className="text-xs text-gray-500">
                          This color will be applied to the navigation icons in the left sidebar.
                        </p>
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
                            placeholder="#6b7280"
                            className="h-10 flex-1 font-mono text-sm"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Color Preview */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-3">Preview</p>
                      <div className="flex gap-3 items-center">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: '#f3f4f6' }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                          </svg>
                        </div>
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: '#f3f4f6' }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                            <line x1="18" x2="18" y1="20" y2="10"/>
                            <line x1="12" x2="12" y1="20" y2="4"/>
                            <line x1="6" x2="6" y1="20" y2="14"/>
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">Navigation icons</span>
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

    </div>
  );
};

