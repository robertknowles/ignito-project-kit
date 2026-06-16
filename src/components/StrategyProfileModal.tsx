import React, { useState, useEffect } from 'react'
import { X, Sparkles, Plus, Trash2 } from 'lucide-react'
import { useStrategyProfiles, newStrategyId, type StrategyProfile } from '@/hooks/useStrategyProfiles'
import { toast } from 'sonner'

interface StrategyProfileModalProps {
  isOpen: boolean
  onClose: () => void
  /** Fired after a successful save so callers can refresh their selection. */
  onSaved?: () => void
}

const PLACEHOLDER = `e.g. "I focus on regional QLD and NSW markets under $500k. I prefer IO loans for the first 5 years. I typically target 7%+ gross yields. I like to buy one property per year maximum."`

const MAX_LENGTH = 2000

/** Default name for a freshly added strategy — "Company Strategy N". */
const nextName = (profiles: StrategyProfile[]): string => {
  const used = new Set(profiles.map((p) => p.name.trim()))
  let n = profiles.length + 1
  while (used.has(`Company Strategy ${n}`)) n += 1
  return `Company Strategy ${n}`
}

export const StrategyProfileModal: React.FC<StrategyProfileModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { profiles, loading, save } = useStrategyProfiles()
  const [draft, setDraft] = useState<StrategyProfile[]>([])
  const [saving, setSaving] = useState(false)

  // Seed the editable draft from the saved strategies each time the modal opens.
  useEffect(() => {
    if (isOpen && !loading) setDraft(profiles.map((p) => ({ ...p })))
  }, [isOpen, loading, profiles])

  const updateOne = (id: string, patch: Partial<StrategyProfile>) =>
    setDraft((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const addOne = () =>
    setDraft((prev) => [...prev, { id: newStrategyId(), name: nextName(prev), text: '' }])

  const removeOne = (id: string) => setDraft((prev) => prev.filter((p) => p.id !== id))

  const handleSave = async () => {
    // Drop entries with no name AND no text; trim the rest.
    const cleaned = draft
      .map((p) => ({ ...p, name: p.name.trim(), text: p.text.trim() }))
      .filter((p) => p.name || p.text)
      .map((p, i) => ({ ...p, name: p.name || `Company Strategy ${i + 1}` }))

    setSaving(true)
    const ok = await save(cleaned)
    setSaving(false)
    if (!ok) {
      toast.error('Failed to save strategies')
      return
    }
    toast.success('Strategies saved')
    onSaved?.()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-[520px] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#7F56D9]" />
            <span className="font-semibold text-sm text-gray-800">Company strategies</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <p className="text-xs text-gray-500 leading-relaxed">
            Save the strategies your firm uses, in plain English. Pick one per client in the chat
            input — the AI factors it into property selection, pricing and plan structure, and
            chooses the best-fit modelling approach from it and the client's brief.
          </p>

          {loading ? (
            <div className="h-[160px] bg-gray-50 rounded-lg animate-pulse" />
          ) : draft.length === 0 ? (
            <div className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-4 py-6 text-center">
              No strategies yet — add your first one below.
            </div>
          ) : (
            draft.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={p.name}
                    onChange={(e) => updateOne(p.id, { name: e.target.value.slice(0, 60) })}
                    placeholder="Strategy name"
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium text-gray-800 border border-gray-200 rounded-md outline-none focus:border-gray-300 transition-colors"
                  />
                  <button
                    onClick={() => removeOne(p.id)}
                    className="flex-shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label={`Delete ${p.name || 'strategy'}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  value={p.text}
                  onChange={(e) => updateOne(p.id, { text: e.target.value.slice(0, MAX_LENGTH) })}
                  placeholder={PLACEHOLDER}
                  rows={5}
                  className="w-full px-3 py-2.5 text-xs text-gray-700 border border-gray-200 rounded-lg resize-none outline-none focus:border-gray-300 transition-colors leading-relaxed placeholder:text-gray-300"
                />
                <div className="text-right text-[10px] text-gray-400">
                  {p.text.length}/{MAX_LENGTH}
                </div>
              </div>
            ))
          )}

          {!loading && (
            <button
              onClick={addOne}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Plus size={14} />
              Add strategy
            </button>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-xs font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
