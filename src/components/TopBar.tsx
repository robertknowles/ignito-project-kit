import React, { useState } from 'react'
import { Share2, Copy } from 'lucide-react'
import { ClientSelector } from './ClientSelector'
import { SaveButton } from './SaveButton'
import { ResetButton } from './ResetButton'
import { useClientSwitching } from '@/hooks/useClientSwitching'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import { useClient } from '@/contexts/ClientContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { TourStep } from '@/components/TourManager'
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
  const { scenarioId } = useScenarioSave()
  const { activeClient } = useClient()
  const { toast } = useToast()
  const { role } = useAuth()
  const isClient = role === 'client'
  
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

  // Initialize client switching logic
  useClientSwitching()

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

      // If no share_id exists, generate one
      if (!shareId) {
        shareId = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15)

        const { error: updateError } = await supabase
          .from('scenarios')
          .update({ share_id: shareId })
          .eq('id', scenarioId)

        if (updateError) throw updateError
      }

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

        // Create a new user account for the client
        const tempPassword = generateTempPassword()
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: clientEmail,
          password: tempPassword,
          options: {
            data: {
              role: 'client',
              client_id: activeClient.id,
            },
          },
        })

        if (authError) {
          // If user already exists, just show the modal with existing info
          if (authError.message.includes('already registered')) {
            setShareCredentials({
              email: clientEmail,
              password: '(Account already exists)',
              loginUrl: `${window.location.origin}/login`,
              clientName: activeClient.name || 'Client',
            })
            setShareModalOpen(true)
            setIsLoading(false)
            return
          }
          throw authError
        }

        const newUserId = authData.user?.id
        if (!newUserId) throw new Error('Failed to create user account')

        // Create user record in users table
        const { error: userInsertError } = await supabase
          .from('users')
          .insert({
            id: newUserId,
            email: clientEmail,
            role: 'client',
            company_id: activeClient.company_id,
          })

        if (userInsertError) {
          console.error('Error creating user record:', userInsertError)
        }

        // Link the client user to the scenario
        const { error: scenarioError } = await supabase
          .from('scenarios')
          .update({ client_user_id: newUserId })
          .eq('id', scenarioId)

        if (scenarioError) {
          console.error('Error updating scenario:', scenarioError)
        }

        // Show credentials modal
        setShareCredentials({
          email: clientEmail,
          password: tempPassword,
          loginUrl: `${window.location.origin}/login`,
          clientName: activeClient.name || 'Client',
        })
        setShareModalOpen(true)
      }
    } catch (error) {
      console.error('Error sharing dashboard:', error)
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

      // Now proceed with creating the user account
      const tempPassword = generateTempPassword()
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: pendingEmail.trim(),
        password: tempPassword,
        options: {
          data: {
            role: 'client',
            client_id: activeClient.id,
          },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setShareCredentials({
            email: pendingEmail.trim(),
            password: '(Account already exists)',
            loginUrl: `${window.location.origin}/login`,
            clientName: activeClient.name || 'Client',
          })
          setShareModalOpen(true)
          setPendingEmail('')
          return
        }
        throw authError
      }

      const newUserId = authData.user?.id
      if (!newUserId) throw new Error('Failed to create user account')

      // Create user record in users table
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          email: pendingEmail.trim(),
          role: 'client',
          company_id: activeClient.company_id,
        })

      if (userInsertError) {
        console.error('Error creating user record:', userInsertError)
      }

      // Link the client user to the scenario
      if (scenarioId) {
        const { error: scenarioError } = await supabase
          .from('scenarios')
          .update({ client_user_id: newUserId })
          .eq('id', scenarioId)

        if (scenarioError) {
          console.error('Error updating scenario:', scenarioError)
        }
      }

      // Show credentials modal
      setShareCredentials({
        email: pendingEmail.trim(),
        password: tempPassword,
        loginUrl: `${window.location.origin}/login`,
        clientName: activeClient.name || 'Client',
      })
      setShareModalOpen(true)
      setPendingEmail('')
    } catch (error) {
      console.error('Error creating client account:', error)
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
    <div id="top-bar" className="sticky top-0 z-40 flex items-center justify-between w-full h-[45px] px-6 bg-white border-b border-gray-200">
      {/* Left side: Scenario Selector (hidden for clients) */}
      <div className="flex items-center">
        {!isClient && (
          <TourStep
            id="client-selector"
            title="Client Selector"
            content="Switch between clients here. Each client has their own saved scenario with unique goals, inputs, and property strategies. Select a client to load their investment plan."
            order={2}
            position="bottom"
          >
            <ClientSelector />
          </TourStep>
        )}
      </div>
      
      {/* Right side: Primary Actions (hidden for clients) */}
      {!isClient && (
        <TourStep
          id="topbar-actions"
          title="Top Bar Actions"
          content="Your main action buttons live here: Save your work, Reset to start fresh, or Share Dashboard to invite your clients to view their personalized dashboard."
          order={3}
          position="bottom"
        >
        <div className="flex items-center gap-3">
          <div id="reset-button-wrapper">
            <ResetButton />
          </div>
          <div id="save-button-wrapper">
            <SaveButton />
          </div>
          <button
            id="client-report-button"
            onClick={handleShareDashboard}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 size={16} />
            <span>{isLoading ? 'Loading...' : 'Share Dashboard'}</span>
          </button>
        </div>
        </TourStep>
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
          <DialogFooter>
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
