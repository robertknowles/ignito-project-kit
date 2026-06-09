import React, { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface StrategyProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

const PLACEHOLDER = `e.g. "I focus on regional QLD and NSW markets under $500k. I prefer IO loans for the first 5 years. I typically target 7%+ gross yields. I like to buy one property per year maximum."`

const MAX_LENGTH = 2000

export const StrategyProfileModal: React.FC<StrategyProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [savedText, setSavedText] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !isOpen) return
    setLoading(true)
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('strategy_profile_text')
        .eq('id', user.id)
        .single()
      const val = (data as Record<string, unknown>)?.strategy_profile_text as string || ''
      setText(val)
      setSavedText(val)
      setLoading(false)
    }
    load()
  }, [user?.id, isOpen])

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ strategy_profile_text: text.trim() || null } as Record<string, unknown>)
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      toast.error('Failed to save strategy profile')
      return
    }
    setSavedText(text.trim())
    toast.success('Strategy profile saved')
    onClose()
  }

  const hasChanges = text.trim() !== savedText

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-[460px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#7F56D9]" />
            <span className="font-semibold text-sm text-gray-800">Strategy Profile</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            Describe your investment philosophy in plain English. This biases the AI toward your preferred approach for every client — locations, price points, yield targets, purchase cadence, loan preferences.
          </p>

          {loading ? (
            <div className="h-[160px] bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <>
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_LENGTH))}
                placeholder={PLACEHOLDER}
                rows={7}
                className="w-full px-3 py-2.5 text-xs text-gray-700 border border-gray-200 rounded-lg resize-none outline-none focus:border-gray-300 transition-colors leading-relaxed placeholder:text-gray-300"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">
                  {text.length}/{MAX_LENGTH}
                </span>
                {savedText && (
                  <span className="text-[10px] text-green-600">Saved profile active</span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-between">
          {savedText ? (
            <button
              onClick={() => setText('')}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-4 py-2 text-xs font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
