/**
 * CompanyStrategySelector — pills for the firm's named company strategies.
 *
 * Replaces StrategyPresetSelector. Instead of the 5 hardcoded engine presets,
 * the BA picks one of the firm's saved strategies (free text). The selected
 * strategy's text is injected into the AI prompt; the AI infers the best-fit
 * engine preset from it + the client brief.
 *
 * Purely presentational — the parent owns selection state (it needs the
 * selected text for the nl-parse wiring) and supplies the strategies.
 */

import React from 'react'
import { Plus as PlusIcon } from 'lucide-react'
import type { StrategyProfile } from '@/hooks/useStrategyProfiles'

interface CompanyStrategySelectorProps {
  profiles: StrategyProfile[]
  selectedId: string | null
  onSelect: (id: string) => void
  onManage: () => void
  /** 'inline-chips' fits inside a chat card; default is a centered stack with a heading. */
  variant?: 'inline-chips'
  loading?: boolean
}

export const CompanyStrategySelector: React.FC<CompanyStrategySelectorProps> = ({
  profiles,
  selectedId,
  onSelect,
  onManage,
  variant,
  loading = false,
}) => {
  const inline = variant === 'inline-chips'

  const pills = (
    <div className={`flex flex-wrap items-center gap-1.5 ${inline ? '' : 'justify-center'}`}>
      {profiles.map((p) => {
        const active = selectedId === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            title={p.text || p.name}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-colors ${
              active
                ? 'text-[#414651] bg-[#ECECED] border-[#D5D7DA]'
                : 'text-[#535862] bg-[#F5F5F6] hover:bg-[#ECECED] border-[#E9EAEB]'
            }`}
          >
            {p.name}
          </button>
        )
      })}

      {profiles.length === 0 ? (
        <button
          type="button"
          onClick={onManage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed text-[11px] font-medium text-[#717680] bg-white border-[#D5D7DA] hover:bg-[#F9FAFB] transition-colors"
        >
          <PlusIcon size={13} />
          Set up company strategies
        </button>
      ) : (
        <button
          type="button"
          onClick={onManage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed text-[11px] font-medium text-[#717680] bg-white border-[#D5D7DA] hover:bg-[#F9FAFB] transition-colors"
        >
          <PlusIcon size={13} />
          Add company strategy
        </button>
      )}
    </div>
  )

  if (loading) {
    return <div className={`h-7 w-40 bg-gray-100 rounded-full animate-pulse ${inline ? '' : 'mx-auto'}`} />
  }

  if (inline) return pills

  return (
    <div className="w-full space-y-2.5">
      <p className="text-[11px] text-[#717680] font-medium text-center">Company strategy</p>
      {pills}
    </div>
  )
}
