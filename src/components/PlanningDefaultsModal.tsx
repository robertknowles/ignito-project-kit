/**
 * PlanningDefaultsModal — Planning Defaults settings panel
 *
 * Gear icon in ChatPanel header opens this modal. BA sets default preferences
 * for property types, states, loan terms, timeline, etc. These feed into
 * every plan generation via the edge function.
 */

import React, { useState, useEffect } from 'react'
import { X, Settings2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface PlanningDefaults {
  preferredPropertyTypes: string[]
  preferredStates: string[]
  defaultGrowthAssumption: 'High' | 'Medium' | 'Low'
  defaultLoanType: 'IO' | 'PI'
  defaultLvr: number
  defaultInterestRate: number
  defaultTimeline: number
  defaultOwnership: 'individual' | 'joint'
  defaultPacing: 'aggressive' | 'balanced' | 'conservative'
}

const DEFAULT_PLANNING: PlanningDefaults = {
  preferredPropertyTypes: [],
  preferredStates: [],
  defaultGrowthAssumption: 'High',
  defaultLoanType: 'IO',
  defaultLvr: 88,
  defaultInterestRate: 6.5,
  defaultTimeline: 15,
  defaultOwnership: 'individual',
  defaultPacing: 'balanced',
}

const PROPERTY_TYPES = [
  { key: 'units-apartments', label: 'Units / Apartments' },
  { key: 'villas-townhouses', label: 'Villas / Townhouses' },
  { key: 'houses-regional', label: 'Houses (Regional)' },
  { key: 'duplexes', label: 'Duplexes' },
  { key: 'small-blocks-3-4-units', label: 'Small Blocks' },
  { key: 'metro-houses', label: 'Metro Houses' },
  { key: 'larger-blocks-10-20-units', label: 'Larger Blocks' },
  { key: 'commercial-property', label: 'Commercial' },
]

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']

interface PlanningDefaultsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const PlanningDefaultsModal: React.FC<PlanningDefaultsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const [defaults, setDefaults] = useState<PlanningDefaults>(DEFAULT_PLANNING)
  const [saving, setSaving] = useState(false)

  // Load from Supabase on mount
  useEffect(() => {
    if (!user?.id || !isOpen) return
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('planning_defaults')
        .eq('id', user.id)
        .single()
      if (data?.planning_defaults) {
        setDefaults({ ...DEFAULT_PLANNING, ...(data.planning_defaults as Partial<PlanningDefaults>) })
      }
    }
    load()
  }, [user?.id, isOpen])

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ planning_defaults: defaults })
      .eq('id', user.id)
    setSaving(false)
    onClose()
  }

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-[420px] max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-gray-500" />
            <span className="font-semibold text-sm text-gray-800">Planning Defaults</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Property Preferences */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Property Preferences</h3>
            <div className="flex flex-wrap gap-1.5">
              {PROPERTY_TYPES.map(pt => (
                <button
                  key={pt.key}
                  onClick={() => setDefaults(d => ({ ...d, preferredPropertyTypes: toggleArrayItem(d.preferredPropertyTypes, pt.key) }))}
                  className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                    defaults.preferredPropertyTypes.includes(pt.key)
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred States */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preferred States</h3>
            <div className="flex flex-wrap gap-1.5">
              {STATES.map(state => (
                <button
                  key={state}
                  onClick={() => setDefaults(d => ({ ...d, preferredStates: toggleArrayItem(d.preferredStates, state) }))}
                  className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                    defaults.preferredStates.includes(state)
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          {/* Growth Assumption */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Default Growth</h3>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {(['High', 'Medium', 'Low'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setDefaults(d => ({ ...d, defaultGrowthAssumption: g }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    defaults.defaultGrowthAssumption === g ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Loan Defaults */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Loan Defaults</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Type</label>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                  {(['IO', 'PI'] as const).map(lt => (
                    <button
                      key={lt}
                      onClick={() => setDefaults(d => ({ ...d, defaultLoanType: lt }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        defaults.defaultLoanType === lt ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      {lt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">LVR %</label>
                <input
                  type="number"
                  min={50}
                  max={95}
                  value={defaults.defaultLvr}
                  onChange={e => setDefaults(d => ({ ...d, defaultLvr: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Rate %</label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  step={0.1}
                  value={defaults.defaultInterestRate}
                  onChange={e => setDefaults(d => ({ ...d, defaultInterestRate: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Planning Defaults */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Planning Defaults</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Timeline (yrs)</label>
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={defaults.defaultTimeline}
                  onChange={e => setDefaults(d => ({ ...d, defaultTimeline: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Ownership</label>
                <select
                  value={defaults.defaultOwnership}
                  onChange={e => setDefaults(d => ({ ...d, defaultOwnership: e.target.value as 'individual' | 'joint' }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md"
                >
                  <option value="individual">Individual</option>
                  <option value="joint">Joint</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Pacing</label>
                <select
                  value={defaults.defaultPacing}
                  onChange={e => setDefaults(d => ({ ...d, defaultPacing: e.target.value as 'aggressive' | 'balanced' | 'conservative' }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md"
                >
                  <option value="aggressive">Aggressive</option>
                  <option value="balanced">Balanced</option>
                  <option value="conservative">Conservative</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Defaults'}
          </button>
        </div>
      </div>
    </div>
  )
}
