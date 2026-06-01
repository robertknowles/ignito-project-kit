import React, { useState } from 'react'
import { Share2, Copy, RotateCcw } from 'lucide-react'
import { ResetButton } from './ResetButton'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import { useClient } from '@/contexts/ClientContext'
import { useMultiScenario } from '@/contexts/MultiScenarioContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const TopBar = () => {
  const { scenarioId, hasUnsavedChanges, isChatRequestInFlight } = useScenarioSave()
  const { activeClient } = useClient()
  const { addScenario, scenarios } = useMultiScenario()
  const { toast } = useToast()
  const { role } = useAuth()
  const navigate = useNavigate()
  const isClient = role === 'client'

  // Tab navigation moved to AppSidebar — TopBar now only hosts action buttons
  
  // State for share dashboard modal
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareCredentials, setShareCredentials] = useState<{
    email: string;
    password: string;
    loginUrl: string;
    clientName: string;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // State for email prompt modal
  const [emailPromptOpen, setEmailPromptOpen] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')

  // Generate share link and open in new tab (Client Report functionality)
  const handleViewClientReport = async () => {
    if (!scenarioId) {
      toast({
        title: 'Save Required',
        description: 'Please save the scenario first before viewing the client report.',
        variant: 'destructive',
      })
      return
    }

    if (hasUnsavedChanges) {
      toast({
        title: 'Unsaved Changes',
        description: 'Please save your changes before viewing the client report.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Check if scenario already has a share_id
      const { data: scenario, error: fetchError } = await supabase
        .from('scenarios')
        .select('share_id')
        .eq('id', scenarioId)
        .single()

      if (fetchError) throw fetchError

      let shareId = scenario?.share_id

      // If no share_id exists, generate one. Guard with .is('share_id', null)
      // so a concurrent click in another tab can't have its newly-generated id
      // overwritten — only one writer wins, the other re-reads the canonical id.
      if (!shareId) {
        const candidate = Math.random().toString(36).substring(2, 15) +
                  Math.random().toString(36).substring(2, 15)

        const { data: updated, error: updateError } = await supabase
          .from('scenarios')
          .update({ share_id: candidate })
          .eq('id', scenarioId)
          .is('share_id', null)
          .select('share_id')

        if (updateError) throw updateError

        if (updated && updated.length > 0) {
          shareId = candidate
        } else {
          const { data: refreshed } = await supabase
            .from('scenarios')
            .select('share_id')
            .eq('id', scenarioId)
            .single()
          shareId = refreshed?.share_id
        }
      }

      // Update client portal_status to 'invited' so the clients page shows "Sent to client"
      if (activeClient) {
        await supabase
          .from('clients')
          .update({ portal_status: 'invited', last_active_at: new Date().toISOString() })
          .eq('id', activeClient.id)
      }

      // Open the client report in a new tab with the share_id
      const reportUrl = `${window.location.origin}/client-view?share_id=${shareId}`
      window.open(reportUrl, '_blank')

      toast({
        title: 'Opening Report',
        description: 'Client report opened in new tab',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate client report link',
        variant: 'destructive',
      })
    }
  }

  // Generate temp password helper
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    password += Math.floor(Math.random() * 10);
    return password;
  };

  // Handle share dashboard button click
  const handleShareDashboard = async () => {
    if (!scenarioId) {
      toast({
        title: 'Save Required',
        description: 'Please save the scenario first before sharing the dashboard.',
        variant: 'destructive',
      })
      return
    }

    if (!activeClient) {
      toast({
        title: 'No Client Selected',
        description: 'Please select a client first.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      // Check if scenario already has a share_id and client_user_id
      const { data: scenario, error: fetchError } = await supabase
        .from('scenarios')
        .select('share_id, client_user_id')
        .eq('id', scenarioId)
        .single()

      if (fetchError) throw fetchError

      let shareId = scenario?.share_id

      // If no share_id exists, generate one. Same null-guard pattern as above
      // so concurrent invite flows can't overwrite each other's generated id.
      if (!shareId) {
        const candidate = Math.random().toString(36).substring(2, 15) +
                  Math.random().toString(36).substring(2, 15)

        const { data: updated, error: updateError } = await supabase
          .from('scenarios')
          .update({ share_id: candidate })
          .eq('id', scenarioId)
          .is('share_id', null)
          .select('share_id')

        if (updateError) throw updateError

        if (updated && updated.length > 0) {
          shareId = candidate
        } else {
          const { data: refreshed } = await supabase
            .from('scenarios')
            .select('share_id')
            .eq('id', scenarioId)
            .single()
          shareId = refreshed?.share_id
        }
      }

      // Update client portal_status so clients page reflects the share
      await supabase
        .from('clients')
        .update({ portal_status: 'invited', last_active_at: new Date().toISOString() })
        .eq('id', activeClient.id)

      // Check if client already has a user account
      if (scenario?.client_user_id) {
        // Client already has an account - show existing credentials
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('id', scenario.client_user_id)
          .single()

        setShareCredentials({
          email: userData?.email || activeClient.email || 'Unknown',
          password: '(Password was sent previously)',
          loginUrl: `${window.location.origin}/login`,
          clientName: activeClient.name || 'Client',
        })
        setShareModalOpen(true)
      } else {
        // Check if client has email - if not, prompt for it
        let clientEmail = activeClient.email
        if (!clientEmail) {
          setIsLoading(false)
          setEmailPromptOpen(true)
          return
        }

        // Create a new user account for the client via the create-client-user
        // edge function. This bypasses the email-confirmation step that
        // supabase.auth.signUp would otherwise require — agents are vouching
        // for the client by manually creating the account, and forcing the
        // client to receive + click a confirm link before they can log in
        // produces "Email not confirmed" errors at sign-in (cofounder report
        // 2026-05-07).
        const tempPassword = generateTempPassword()
        const { data: invokeData, error: invokeError } = await supabase.functions.invoke(
          'create-client-user',
          {
            body: {
              email: clientEmail,
              password: tempPassword,
              clientId: activeClient.id,
              companyId: activeClient.company_id ?? null,
              scenarioId,
            },
          },
        )
        if (invokeError) throw invokeError
        const result = invokeData as { ok: boolean; alreadyExisted?: boolean; error?: string }
        if (!result?.ok) throw new Error(result?.error || 'Failed to create client account')

        if (result.alreadyExisted) {
          setShareCredentials({
            email: clientEmail,
            password: '(Account already exists — use Forgot password to reset)',
            loginUrl: `${window.location.origin}/login`,
            clientName: activeClient.name || 'Client',
          })
        } else {
          setShareCredentials({
            email: clientEmail,
            password: tempPassword,
            loginUrl: `${window.location.origin}/login`,
            clientName: activeClient.name || 'Client',
          })
        }
        setShareModalOpen(true)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate share credentials',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle email prompt submission
  const handleEmailPromptSubmit = async () => {
    if (!pendingEmail.trim() || !activeClient) return

    setIsLoading(true)
    setEmailPromptOpen(false)

    try {
      // Update client with the new email
      const { error: updateError } = await supabase
        .from('clients')
        .update({ email: pendingEmail.trim() })
        .eq('id', activeClient.id)

      if (updateError) throw updateError

      // Now proceed with creating the user account via the auto-confirming
      // edge function (see comment in handleShareDashboard above for why we
      // can't use supabase.auth.signUp from the browser here).
      const tempPassword = generateTempPassword()
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke(
        'create-client-user',
        {
          body: {
            email: pendingEmail.trim(),
            password: tempPassword,
            clientId: activeClient.id,
            companyId: activeClient.company_id ?? null,
            scenarioId: scenarioId ?? undefined,
          },
        },
      )
      if (invokeError) throw invokeError
      const result = invokeData as { ok: boolean; alreadyExisted?: boolean; error?: string }
      if (!result?.ok) throw new Error(result?.error || 'Failed to create client account')

      if (result.alreadyExisted) {
        setShareCredentials({
          email: pendingEmail.trim(),
          password: '(Account already exists — use Forgot password to reset)',
          loginUrl: `${window.location.origin}/login`,
          clientName: activeClient.name || 'Client',
        })
      } else {
        setShareCredentials({
          email: pendingEmail.trim(),
          password: tempPassword,
          loginUrl: `${window.location.origin}/login`,
          clientName: activeClient.name || 'Client',
        })
      }
      setShareModalOpen(true)
      setPendingEmail('')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create client account',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div id="top-bar" className="flex items-center gap-1.5">
      {!isClient && (
        <>
          <ResetButton iconOnly />
          <button
            onClick={handleShareDashboard}
            disabled={isLoading || !scenarioId || hasUnsavedChanges}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            title={
              !scenarioId
                ? 'Save the scenario before sharing'
                : hasUnsavedChanges
                  ? 'Save your changes before sharing'
                  : 'Share dashboard with client'
            }
          >
            <Share2 size={15} />
          </button>
        </>
      )}

      {/* Share Dashboard Credentials Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dashboard Login Credentials</DialogTitle>
            <DialogDescription>
              Share these credentials with {shareCredentials?.clientName} so they can access their investment dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={shareCredentials?.email || ''}
                  readOnly
                  className="bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(shareCredentials?.email || '');
                    toast({
                      title: 'Copied!',
                      description: 'Email copied to clipboard',
                    });
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
                  value={shareCredentials?.password || ''}
                  readOnly
                  className="bg-gray-50 font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(shareCredentials?.password || '');
                    toast({
                      title: 'Copied!',
                      description: 'Password copied to clipboard',
                    });
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
                  value={shareCredentials?.loginUrl || ''}
                  readOnly
                  className="bg-gray-50 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(shareCredentials?.loginUrl || '');
                    toast({
                      title: 'Copied!',
                      description: 'Login URL copied to clipboard',
                    });
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Reset button - allows restarting the invite process */}
            <Button
              variant="outline"
              className="text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-orange-700"
              onClick={async () => {
                if (!scenarioId) return;
                
                try {
                  // Clear the client_user_id from the scenario to allow re-invite
                  const { error } = await supabase
                    .from('scenarios')
                    .update({ client_user_id: null })
                    .eq('id', scenarioId);
                  
                  if (error) throw error;
                  
                  setShareModalOpen(false);
                  setShareCredentials(null);
                  toast({
                    title: 'Invite Reset',
                    description: 'You can now start the invite process again with a new email or password.',
                  });
                } catch (error) {
                  toast({
                    title: 'Error',
                    description: 'Failed to reset invite. Please try again.',
                    variant: 'destructive',
                  });
                }
              }}
            >
              <RotateCcw size={14} className="mr-1" />
              Reset Invite
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const text = `Dashboard Login for ${shareCredentials?.clientName}\n\nEmail: ${shareCredentials?.email}\nPassword: ${shareCredentials?.password}\nLogin URL: ${shareCredentials?.loginUrl}`;
                  navigator.clipboard.writeText(text);
                  toast({
                    title: 'Copied!',
                    description: 'All credentials copied to clipboard',
                  });
                }}
              >
                Copy All
              </Button>
              <Button variant="outline" onClick={() => setShareModalOpen(false)}>
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Prompt Modal */}
      <Dialog open={emailPromptOpen} onOpenChange={setEmailPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Email Required</DialogTitle>
            <DialogDescription>
              Enter the email address for {activeClient?.name} to send them dashboard access.
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
  )
}
