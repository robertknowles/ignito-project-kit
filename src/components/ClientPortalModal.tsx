import React, { useState, useEffect } from 'react'
import { Copy, Loader2, Mail, CheckCircle2, UserCog } from 'lucide-react'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import { useClient } from '@/contexts/ClientContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { track, EVENTS } from '@/lib/analytics'
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

interface ClientPortalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Phase = 'checking' | 'setup' | 'working' | 'done' | 'error'

interface PortalResult {
  email: string
  password: string | null // null when the account already existed
  loginUrl: string
  emailed: boolean
  emailError: string | null
}

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 10; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))
  return password + Math.floor(Math.random() * 10)
}

/**
 * "Set up Client Portal". Provisions the client's own login (role: client) and
 * emails them a sign-in link so they get a personalised, read-only copy of this
 * plan inside PropPath - editable only on their Existing Portfolio tab.
 *
 * Account creation runs through the already-deployed `create-client-user`
 * function; the invite email (with a one-click magic link) runs through
 * `send-portal-invite`. If the email function isn't deployed yet, the modal
 * still succeeds and shows the sign-in details for the agent to send manually.
 */
export const ClientPortalModal: React.FC<ClientPortalModalProps> = ({ open, onOpenChange }) => {
  const { scenarioId, hasUnsavedChanges } = useScenarioSave()
  const { activeClient } = useClient()
  const { toast } = useToast()

  const [phase, setPhase] = useState<Phase>('checking')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [alreadySetUp, setAlreadySetUp] = useState(false)
  const [result, setResult] = useState<PortalResult | null>(null)

  // On open: figure out whether this scenario already has a linked portal user.
  useEffect(() => {
    if (!open) return
    let cancelled = false

    const check = async () => {
      setResult(null)
      setErrorMsg(null)
      setEmail(activeClient?.email ?? '')

      if (!scenarioId) {
        if (!cancelled) { setPhase('error'); setErrorMsg('Save this scenario first, then you can set up the client portal.') }
        return
      }
      if (hasUnsavedChanges) {
        if (!cancelled) { setPhase('error'); setErrorMsg('You have unsaved changes. Save them first so your client sees the latest plan.') }
        return
      }

      setPhase('checking')
      try {
        const { data, error } = await supabase
          .from('scenarios')
          .select('client_user_id')
          .eq('id', scenarioId)
          .single()
        if (error) throw error
        if (cancelled) return
        setAlreadySetUp(!!data?.client_user_id)
        setPhase('setup')
      } catch {
        if (cancelled) return
        setPhase('setup')
      }
    }

    check()
    return () => { cancelled = true }
  }, [open, scenarioId, hasUnsavedChanges, activeClient])

  const handleSetup = async () => {
    if (!scenarioId || !activeClient) return
    const targetEmail = email.trim()
    if (!targetEmail) {
      setErrorMsg('Enter the client’s email address.')
      return
    }

    setPhase('working')
    setErrorMsg(null)

    try {
      // 1. Persist the email on the client record if it changed / was blank.
      if (targetEmail !== activeClient.email) {
        await supabase.from('clients').update({ email: targetEmail }).eq('id', activeClient.id)
      }

      // 2. Provision (or look up) the client's auth account via the deployed
      //    create-client-user function.
      const tempPassword = generateTempPassword()
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('create-client-user', {
        body: {
          email: targetEmail,
          password: tempPassword,
          clientId: activeClient.id,
          companyId: activeClient.company_id ?? null,
          scenarioId,
        },
      })
      if (invokeError) throw invokeError
      const provision = invokeData as { ok: boolean; alreadyExisted?: boolean; error?: string }
      if (!provision?.ok) throw new Error(provision?.error || 'Failed to create the client account.')

      // 3. Mark the client as invited so the CRM reflects the share.
      await supabase
        .from('clients')
        .update({ portal_status: 'invited', last_active_at: new Date().toISOString() })
        .eq('id', activeClient.id)

      track(EVENTS.planShared, { share_type: 'client_portal' })

      const loginUrl = `${window.location.origin}/login`
      const passwordForClient = provision.alreadyExisted ? null : tempPassword

      // 4. Best-effort invite email with a one-click sign-in link. If the
      //    function isn't deployed yet this fails softly and the agent can
      //    still send the details shown in the modal manually.
      let emailed = false
      let emailError: string | null = null
      try {
        const { data: emailData, error: emailInvokeError } = await supabase.functions.invoke('send-portal-invite', {
          body: {
            email: targetEmail,
            clientName: activeClient.name ?? 'there',
            clientId: activeClient.id,
            scenarioId,
            appOrigin: window.location.origin,
            tempPassword: passwordForClient,
          },
        })
        if (emailInvokeError) throw emailInvokeError
        const sent = emailData as { ok: boolean; error?: string }
        if (sent?.ok) emailed = true
        else emailError = sent?.error || 'Email could not be sent.'
      } catch (e) {
        emailError = e instanceof Error ? e.message : 'Email service unavailable.'
      }

      setResult({ email: targetEmail, password: passwordForClient, loginUrl, emailed, emailError })
      setPhase('done')
    } catch (e) {
      setPhase('error')
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong setting up the portal.')
    }
  }

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied!', description: `${label} copied to clipboard` })
  }

  const copyAll = () => {
    if (!result) return
    const lines = [
      `Your ${activeClient?.name ? '' : ''}PropPath portal is ready.`,
      `Sign in here: ${result.loginUrl}`,
      `Email: ${result.email}`,
      result.password ? `Temporary password: ${result.password}` : `Use "Forgot password" to set your password.`,
    ]
    copy(lines.join('\n'), 'Portal details')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set up portal for {activeClient?.name || 'client'}</DialogTitle>
          <DialogDescription>
            Give your client their own secure login to view this plan inside PropPath. They see
            it read-only and can only update their Existing Portfolio - your plan stays exactly as you built it.
          </DialogDescription>
        </DialogHeader>

        {phase === 'checking' && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500">
            <Loader2 size={16} className="animate-spin" /> Checking portal status…
          </div>
        )}

        {phase === 'error' && (
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{errorMsg}</div>
          </div>
        )}

        {(phase === 'setup' || phase === 'working') && (
          <div className="grid gap-4 py-4">
            {alreadySetUp && (
              <div className="flex items-start gap-2 bg-[#F5F3FF] border border-[#E9D5FF] rounded-lg p-3 text-sm text-[#5B21B6]">
                <UserCog size={16} className="mt-0.5 shrink-0" />
                <span>This client already has a portal login. Re-sending will email them a fresh sign-in link.</span>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="portal-email">Client email</Label>
              <Input
                id="portal-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                disabled={phase === 'working'}
              />
            </div>
            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
          </div>
        )}

        {phase === 'done' && result && (
          <div className="grid gap-4 py-4">
            <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${result.emailed ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
              {result.emailed ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <Mail size={16} className="mt-0.5 shrink-0" />}
              <span>
                {result.emailed
                  ? `Invite emailed to ${result.email} with a one-click sign-in link.`
                  : `Account is ready, but the invite email couldn't be sent automatically. Send your client the details below.`}
              </span>
            </div>
            <div className="grid gap-2">
              <Label>Sign-in link</Label>
              <div className="flex items-center gap-2">
                <Input value={result.loginUrl} readOnly className="bg-gray-50 text-sm" />
                <Button variant="outline" size="sm" onClick={() => copy(result.loginUrl, 'Sign-in link')}><Copy size={14} /></Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2">
                <Input value={result.email} readOnly className="bg-gray-50 text-sm" />
                <Button variant="outline" size="sm" onClick={() => copy(result.email, 'Email')}><Copy size={14} /></Button>
              </div>
            </div>
            {result.password && (
              <div className="grid gap-2">
                <Label>Temporary password</Label>
                <div className="flex items-center gap-2">
                  <Input value={result.password} readOnly className="bg-gray-50 font-mono text-sm" />
                  <Button variant="outline" size="sm" onClick={() => copy(result.password!, 'Password')}><Copy size={14} /></Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {phase === 'setup' && (
            <Button onClick={handleSetup}>
              <Mail size={14} className="mr-1.5" />
              {alreadySetUp ? 'Resend invite' : 'Set up & send invite'}
            </Button>
          )}
          {phase === 'working' && (
            <Button disabled><Loader2 size={14} className="mr-1.5 animate-spin" /> Setting up…</Button>
          )}
          {phase === 'done' && (
            <>
              <Button variant="outline" onClick={copyAll}>Copy all</Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </>
          )}
          {phase === 'error' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
