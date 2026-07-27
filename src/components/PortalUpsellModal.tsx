import React from 'react'
import { Sparkles, LogIn, MessageSquareText, RefreshCw, Building2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface PortalUpsellModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Shown from the read-only share view (/client-view) when the client asks about
 * getting their own portal. The portal's key differentiator over a live link is
 * AI support - a private space to ask questions and run what-ifs on the plan -
 * so we lead with that. Self-service account provisioning isn't wired for an
 * anonymous share visitor (accounts are created agent-side), so this offers the
 * working path - logging in - and directs new clients to their advisor.
 */
export const PortalUpsellModal: React.FC<PortalUpsellModalProps> = ({ open, onOpenChange }) => {
  const goToLogin = () => {
    window.open(`${window.location.origin}/login`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#7C3AED]" />
            Get AI support in your portal
          </DialogTitle>
          <DialogDescription>
            This link is a live, read-only view of your plan. Your own portal adds an
            AI assistant and a private space to explore it - things a shared link can't do.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="flex items-start gap-3">
            <MessageSquareText size={16} className="mt-0.5 shrink-0 text-[#7C3AED]" />
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-neutral-800">Ask the AI anything</span> about your
              plan - what a purchase means, why a year works, what happens if something changes.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <RefreshCw size={16} className="mt-0.5 shrink-0 text-[#7C3AED]" />
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-neutral-800">Keep your details current</span> and
              your advisor is notified to refresh the plan.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Building2 size={16} className="mt-0.5 shrink-0 text-[#7C3AED]" />
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-neutral-800">Update your existing portfolio</span> so
              your projections stay accurate over time.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-[#F5F3FF] border border-[#E9D5FF] p-3 text-xs text-[#5B21B6]">
          Don't have a login yet? Ask your advisor to set up your portal - they'll send you a
          one-click sign-in link.
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Not now</Button>
          <Button onClick={goToLogin}>
            <LogIn size={14} className="mr-1.5" />
            Log in to portal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
