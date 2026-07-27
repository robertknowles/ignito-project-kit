import React, { useState, useEffect, useCallback } from 'react'
import { Copy, Loader2, Mail, CheckCircle2, UserCog, Link2, ExternalLink, ChevronDown } from 'lucide-react'
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

/** Overall gate: can we share this scenario at all yet? */
type Gate = 'checking' | 'ready' | 'blocked'
/** The optional portal-login sub-flow. */
type PortalPhase = 'idle' | 'working' | 'done' | 'error'

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

/** Read the scenario's share_id, generating one if it doesn't have one yet.
 *  Uses the same null-guarded update as the legacy TopBar flow so two
 *  concurrent opens can't clobber each other's generated id - only one writer
 *  wins and the loser re-reads the canonical value. */
const ensureShareId = async (scenarioId: string): Promise<string> => {
  const { data: scenario, error } = await supabase
    .from('scenarios')
    .select('share_id')
    .eq('id', scenarioId)
    .single()
  if (error) throw error

  if (scenario?.share_id) return scenario.share_id

  const candidate =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  const { data: updated, error: updateError } = await supabase
    .from('scenarios')
    .update({ share_id: candidate })
    .eq('id', scenarioId)
    .is('share_id', null)
    .select('share_id')
  if (updateError) throw updateError

  if (updated && updated.length > 0) return candidate

  const { data: refreshed } = await supabase
    .from('scenarios')
    .select('share_id')
    .eq('id', scenarioId)
    .single()
  if (!refreshed?.share_id) throw new Error('Could not generate a share link.')
  return refreshed.share_id
}

/**
 * "Share with client". Leads with a live, no-login link the agent can paste
 * straight into their own email - the client clicks it and sees a read-only,
 * always-current copy of the plan without ever creating an account. This keeps
 * the client out of the platform entirely, which is what most agents want:
 * zero onboarding friction, nothing for the client to sign up for.
 *
 * A full portal login (their own account, editable Existing Portfolio) is still
 * available as an optional step for agents who want it - demoted here because
 * it's the heavier commitment, not the default.
 */
export const ClientPortalModal: React.FC<ClientPortalModalProps> = ({ open, onOpenChange }) => {
  const { scenarioId, hasUnsavedChanges } = useScenarioSave()
  const { activeClient } = useClient()
  const { toast } = useToast()

  const [gate, setGate] = useState<Gate>('checking')
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null)
  const [liveLink, setLiveLink] = useState<string | null>(null)

  // Optional portal-login sub-flow state.
  const [showPortal, setShowPortal] = useState(false)
  const [portalPhase, setPortalPhase] = useState<PortalPhase>('idle')
  const [portalError, setPortalError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [alreadySetUp, setAlreadySetUp] = useState(false)
  const [result, setResult] = useState<PortalResult | null>(null)

  // On open: gate on save state, then generate the live link and check whether
  // a portal login already exists.
  useEffect(() => {
    if (!open) return
    let cancelled = false

    // Reset transient state each time the modal opens.
    setLiveLink(null)
    setResult(null)
    setPortalError(null)
    setPortalPhase('idle')
    setShowPortal(false)
    setEmail(activeClient?.email ?? '')

    const check = async () => {
      if (!scenarioId) {
        if (!cancelled) { setGate('blocked'); setBlockedMsg('Save this scenario first, then you can share it with your client.') }
        return
      }
      if (hasUnsavedChanges) {
        if (!cancelled) { setGate('blocked'); setBlockedMsg('You have unsaved changes. Save them first so your client sees the latest plan.') }
        return
      }

      setGate('checking')
      try {
        const shareId = await ensureShareId(scenarioId)
        if (cancelled) return
        setLiveLink(`${window.location.origin}/client-view?share_id=${shareId}`)

        const { data } = await supabase
          .from('scenarios')
          .select('client_user_id')
          .eq('id', scenarioId)
          .single()
        if (cancelled) return
        setAlreadySetUp(!!data?.client_user_id)
        setGate('ready')
      } catch (e) {
        if (cancelled) return
        setGate('blocked')
        setBlockedMsg(e instanceof Error ? e.message : 'Could not prepare the share link.')
      }
    }

    check()
    return () => { cancelled = true }
  }, [open, scenarioId, hasUnsavedChanges, activeClient])

  const copy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied!', description: `${label} copied to clipboard` })
  }, [toast])

  // Mark the client as "sent" in the CRM the first time the agent actually
  // shares the live link (copies or opens it) - opening the modal alone
  // shouldn't flip their status.
  const markShared = useCallback(async () => {
    if (!activeClient) return
    await supabase
      .from('clients')
      .update({ portal_status: 'invited', last_active_at: new Date().toISOString() })
      .eq('id', activeClient.id)
  }, [activeClient])

  const handleCopyLink = useCallback(() => {
    if (!liveLink) return
    copy(liveLink, 'Live link')
    track(EVENTS.planShared, { share_type: 'live_link' })
    markShared()
  }, [liveLink, copy, markShared])

  const handleOpenPreview = useCallback(() => {
    if (!liveLink) return
    window.open(liveLink, '_blank')
    track(EVENTS.planShared, { share_type: 'live_link_preview' })
    markShared()
  }, [liveLink, markShared])

  const handleSetup = async () => {
    if (!scenarioId || !activeClient) return
    const targetEmail = email.trim()
    if (!targetEmail) {
      setPortalError('Enter the client’s email address.')
      return
    }

    setPortalPhase('working')
    setPortalError(null)

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
      setPortalPhase('done')
    } catch (e) {
      setPortalPhase('error')
      setPortalError(e instanceof Error ? e.message : 'Something went wrong setting up the portal.')
    }
  }

  const copyAllPortal = () => {
    if (!result) return
    const lines = [
      `Your PropPath portal is ready.`,
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
          <DialogTitle>Share with {activeClient?.name || 'client'}</DialogTitle>
          <DialogDescription>
            Send your client a live link to their plan. They just click it - no login, no account,
            nothing to sign up for. The link always shows your latest saved plan.
          </DialogDescription>
        </DialogHeader>

        {gate === 'checking' && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500">
            <Loader2 size={16} className="animate-spin" /> Preparing your share link…
          </div>
        )}

        {gate === 'blocked' && (
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{blockedMsg}</div>
          </div>
        )}

        {gate === 'ready' && (
          <div className="grid gap-4 py-4">
            {/* ── Primary: live, no-login link ── */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Link2 size={14} className="text-[#717680]" /> Live link
              </Label>
              <div className="flex items-center gap-2">
                <Input value={liveLink ?? ''} readOnly className="bg-gray-50 text-sm" />
                <Button variant="outline" size="sm" onClick={handleCopyLink} title="Copy live link">
                  <Copy size={14} />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">Paste this into your own email to the client. No login required.</p>
                <button
                  onClick={handleOpenPreview}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#535862] hover:text-[#414651] transition-colors shrink-0"
                >
                  <ExternalLink size={12} /> Preview
                </button>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-[#E9EAEB]" />

            {/* ── Secondary/optional: full portal login ── */}
            <div>
              <button
                onClick={() => setShowPortal((v) => !v)}
                className="flex w-full items-center gap-2 text-left text-sm font-medium text-[#414651] hover:text-[#181D27] transition-colors"
              >
                <UserCog size={15} className="text-[#717680]" />
                <span>
                  {alreadySetUp ? 'Manage their portal login' : 'Prefer they have their own login?'}
                  <span className="ml-1.5 text-xs font-normal text-neutral-400">Optional</span>
                </span>
                <ChevronDown size={15} className={`ml-auto text-[#717680] transition-transform ${showPortal ? 'rotate-180' : ''}`} />
              </button>

              {showPortal && (
                <div className="mt-3 grid gap-3">
                  <p className="text-xs text-neutral-500">
                    Gives the client their own secure account to sign in to PropPath. They see the plan read-only and can
                    only edit their Existing Portfolio - your plan stays exactly as you built it.
                  </p>

                  {alreadySetUp && portalPhase !== 'done' && (
                    <div className="flex items-start gap-2 bg-[#F5F3FF] border border-[#E9D5FF] rounded-lg p-3 text-xs text-[#5B21B6]">
                      <UserCog size={14} className="mt-0.5 shrink-0" />
                      <span>This client already has a portal login. Re-sending will email them a fresh sign-in link.</span>
                    </div>
                  )}

                  {portalPhase !== 'done' && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="portal-email" className="text-xs">Client email</Label>
                        <Input
                          id="portal-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="client@example.com"
                          disabled={portalPhase === 'working'}
                        />
                      </div>
                      {portalError && <p className="text-sm text-red-600">{portalError}</p>}
                      <div className="flex justify-end">
                        {portalPhase === 'working' ? (
                          <Button variant="outline" disabled>
                            <Loader2 size={14} className="mr-1.5 animate-spin" /> Setting up…
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={handleSetup}>
                            <Mail size={14} className="mr-1.5" />
                            {alreadySetUp ? 'Resend invite' : 'Set up & send invite'}
                          </Button>
                        )}
                      </div>
                    </>
                  )}

                  {portalPhase === 'done' && result && (
                    <div className="grid gap-3">
                      <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${result.emailed ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                        {result.emailed ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <Mail size={16} className="mt-0.5 shrink-0" />}
                        <span>
                          {result.emailed
                            ? `Invite emailed to ${result.email} with a one-click sign-in link.`
                            : `Account is ready, but the invite email couldn't be sent automatically. Send your client the details below.`}
                        </span>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs">Sign-in link</Label>
                        <div className="flex items-center gap-2">
                          <Input value={result.loginUrl} readOnly className="bg-gray-50 text-sm" />
                          <Button variant="outline" size="sm" onClick={() => copy(result.loginUrl, 'Sign-in link')}><Copy size={14} /></Button>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs">Email</Label>
                        <div className="flex items-center gap-2">
                          <Input value={result.email} readOnly className="bg-gray-50 text-sm" />
                          <Button variant="outline" size="sm" onClick={() => copy(result.email, 'Email')}><Copy size={14} /></Button>
                        </div>
                      </div>
                      {result.password && (
                        <div className="grid gap-2">
                          <Label className="text-xs">Temporary password</Label>
                          <div className="flex items-center gap-2">
                            <Input value={result.password} readOnly className="bg-gray-50 font-mono text-sm" />
                            <Button variant="outline" size="sm" onClick={() => copy(result.password!, 'Password')}><Copy size={14} /></Button>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={copyAllPortal}>Copy all</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {gate === 'blocked' ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
