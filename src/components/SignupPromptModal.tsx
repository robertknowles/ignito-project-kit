import React from 'react'
import { X, Sparkles } from 'lucide-react'

interface SignupPromptModalProps {
  open: boolean
  onClose: () => void
}

/**
 * Shown when a client viewing a read-only shared report tries to add or edit
 * something (e.g. "Add existing property"). Rather than letting them change a
 * report that isn't theirs, it invites them to create their own free PropPath
 * account - the growth loop that turns a shared plan into a new signup.
 *
 * pointer-events-auto on the overlay keeps it interactive even though the
 * report content sits inside a pointer-events-none (view-only) ancestor.
 */
export const SignupPromptModal: React.FC<SignupPromptModalProps> = ({ open, onClose }) => {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center">
            <Sparkles size={20} className="text-[#7C3AED]" />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="text-lg font-semibold text-[#181D27] mb-1.5">
          Model your own portfolio
        </h2>
        <p className="text-sm text-[#535862] leading-relaxed mb-5">
          This plan was prepared for you in PropPath. To add your own properties and
          explore the numbers yourself, create a free account — it only takes a minute.
        </p>

        <div className="flex flex-col gap-2">
          <a
            href="/signup"
            className="w-full text-center px-4 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#6941C6] transition-colors"
          >
            Create your free account
          </a>
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-[#535862] hover:bg-gray-50 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
