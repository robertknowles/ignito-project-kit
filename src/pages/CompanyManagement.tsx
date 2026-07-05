import React, { useState, useEffect, useRef } from 'react';
import {
  Building2Icon,
  UsersIcon,
  PaletteIcon,
  ToggleLeftIcon,
  ImageIcon,
  CheckIcon,
  Loader2Icon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { AppSidebar, SIDEBAR_WIDTH } from '@/components/AppSidebar';
// HomeDrawer removed — navigation restructured
import { useCompany, TeamMember } from '@/contexts/CompanyContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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

export const CompanyManagementContent = () => {
  const {
    company,
    teamMembers,
    loading: companyLoading,
    updateCompanyBranding,
    updateMemberRole,
  } = useCompany();
  
  const { branding, updateBranding, loading: brandingLoading } = useBranding();
  const { companyId } = useAuth();
  const { toast } = useToast();

  // Drawer removed

  // Role update state
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // Branding form state
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6b7280');
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingChanged, setBrandingChanged] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (file: File) => {
    if (!companyId) {
      toast({ title: 'No company found', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Logo must be under 2MB.', variant: 'destructive' });
      return;
    }

    setUploadingLogo(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `${companyId}/logo.${ext}`;

    // Remove old logo if it exists in storage
    if (logoUrl?.includes('company-assets')) {
      const oldPath = logoUrl.split('/company-assets/')[1];
      if (oldPath) await supabase.storage.from('company-assets').remove([oldPath]);
    }

    const { error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setUploadingLogo(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(filePath);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    setLogoUrl(newUrl);
    setUploadingLogo(false);
    toast({ title: 'Logo uploaded', description: 'Click Save Branding to apply.' });
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
  };

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
    <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="page-title">Company Management</h1>
              <p className="body-secondary mt-0.5">
                Manage your team, branding, and client portal settings
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2Icon className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Section A: Team Management */}
                <section>
                  <h2 className="section-heading mb-4">Team Management</h2>

                  {/* Team Members Table */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {teamMembers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40">
                        <UsersIcon size={40} className="text-gray-300 mb-2" />
                        <p className="body-secondary">No team members yet</p>
                        <p className="meta mt-1">
                          Invite agents to start building your team
                        </p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 text-left">
                            <th className="table-header">Member</th>
                            <th className="table-header">Role</th>
                            <th className="table-header">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamMembers.map((member) => {
                            const displayName = member.full_name || member.email || 'Team Member';
                            const initials = member.full_name
                              ? member.full_name
                                  .split(' ')
                                  .map((word) => word[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)
                              : (member.email ? member.email[0].toUpperCase() : 'T');

                            return (
                              <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors last:border-b-0">
                                <td className="table-cell">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-medium mr-3">
                                      {initials}
                                    </div>
                                    <div>
                                      <div className="body-dark font-medium">
                                        {displayName}
                                      </div>
                                      {member.full_name && member.email && (
                                        <div className="meta">{member.email}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="table-cell">
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
                                <td className="table-cell">
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
                  <h2 className="section-heading mb-4">Branding</h2>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Company Name */}
                      <div className="space-y-2">
                        <Label htmlFor="company-name" className="body-dark font-medium">
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

                      {/* Logo Upload */}
                      <div className="space-y-2">
                        <Label className="body-dark font-medium">
                          Company Logo
                        </Label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                            e.target.value = '';
                          }}
                        />
                        {logoUrl ? (
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                              <img
                                src={logoUrl}
                                alt="Company logo"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingLogo}
                              >
                                {uploadingLogo ? (
                                  <><Loader2Icon size={14} className="animate-spin mr-1.5" />Uploading...</>
                                ) : (
                                  <><UploadIcon size={14} className="mr-1.5" />Replace</>
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleRemoveLogo}
                                className="text-gray-500 hover:text-red-600"
                              >
                                <XIcon size={14} className="mr-1.5" />Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className="w-full h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-gray-600 transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100"
                          >
                            {uploadingLogo ? (
                              <><Loader2Icon size={20} className="animate-spin" /><span className="text-sm">Uploading...</span></>
                            ) : (
                              <><UploadIcon size={20} /><span className="text-sm">Click to upload logo</span><span className="text-xs text-gray-400">PNG, JPG, SVG, or WebP (max 2MB)</span></>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Primary Color */}
                      <div className="space-y-2">
                        <Label htmlFor="primary-color" className="body-dark font-medium">
                          Primary Color
                        </Label>
                        <p className="meta">
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
                      <p className="meta mb-3">Preview</p>
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
                        <span className="meta ml-2">Navigation icons</span>
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
                  <h2 className="section-heading mb-4">Client Portal Settings</h2>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="body-dark font-medium">Enable Client Interactivity</h3>
                        <p className="meta mt-1">
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
    </>
  );
};

export const CompanyManagement = () => (
  <div className="main-app flex h-screen w-full bg-[#f9fafb]">
    <AppSidebar />
    <div className="flex-1 overflow-hidden" style={{ marginLeft: `var(--app-sidebar-width, ${SIDEBAR_WIDTH}px)`, transition: 'margin-left 200ms ease-in-out' }}>
      <div className="h-full overflow-auto">
        <div className="flex-1 overflow-auto p-8">
          <CompanyManagementContent />
        </div>
      </div>
    </div>
  </div>
);

