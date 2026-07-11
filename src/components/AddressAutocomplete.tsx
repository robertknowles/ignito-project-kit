/**
 * Google Places address autocomplete input.
 *
 * Two visual variants sharing the same behaviour:
 *  - 'input': standard form field (shadcn Input styling) for modals/forms
 *  - 'cell':  borderless inline cell matching the Portfolio table's TextCell
 *
 * Degrades to a plain text input when VITE_GOOGLE_MAPS_BROWSER_KEY is absent.
 */
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAddressSearch, type AddressSelection } from '@/hooks/useAddressSearch'

interface AddressAutocompleteProps {
  value: string
  onInputChange: (value: string) => void
  onSelect: (selection: AddressSelection) => void
  placeholder?: string
  variant?: 'input' | 'cell'
  id?: string
  className?: string
}

const VARIANT_CLASSES: Record<'input' | 'cell', string> = {
  input:
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  cell:
    'w-full bg-transparent text-xs text-[#535862] py-1 px-1 border-0 outline-none rounded hover:bg-[#F4F4F5] focus:bg-white focus:ring-1 focus:ring-violet-300 transition-colors',
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onInputChange,
  onSelect,
  placeholder,
  variant = 'input',
  id,
  className,
}) => {
  const { suggestions, loading, search, clear, resolvePlace, enabled } = useAddressSearch()
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [resolving, setResolving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        !(dropdownRef.current && dropdownRef.current.contains(target))
      ) {
        setOpen(false)
        clear()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clear])

  const handleChange = (v: string) => {
    onInputChange(v)
    if (enabled) {
      search(v)
      setOpen(true)
      setHighlighted(0)
    }
  }

  const handlePick = async (placeId: string, fallbackText: string) => {
    setOpen(false)
    clear()
    setResolving(true)
    const selection = await resolvePlace(placeId)
    setResolving(false)
    if (selection) {
      onSelect(selection)
    } else {
      // details lookup failed — keep the picked suggestion text at least
      onInputChange(fallbackText)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const s = suggestions[highlighted]
      if (s) handlePick(s.placeId, s.fullText)
    } else if (e.key === 'Escape') {
      setOpen(false)
      clear()
    }
  }

  const showDropdown = open && (suggestions.length > 0 || loading)

  // Portal the dropdown to <body> so it escapes clipping ancestors
  // (e.g. the Existing Portfolio table's overflow-x-auto wrapper).
  const inputRect = showDropdown ? containerRef.current?.getBoundingClientRect() : undefined

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(VARIANT_CLASSES[variant], className)}
      />
      {(loading || resolving) && (
        <Loader2
          size={variant === 'cell' ? 12 : 14}
          className="animate-spin text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      )}
      {showDropdown && inputRect && createPortal(
        <div
          ref={dropdownRef}
          className="z-[100] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          style={{
            position: 'fixed',
            top: inputRect.bottom + 4,
            left: inputRect.left,
            width: Math.max(inputRect.width, 280),
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.placeId}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => handlePick(s.placeId, s.fullText)}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                'w-full flex items-start gap-2 px-3 py-2 text-left transition-colors',
                i === highlighted ? 'bg-gray-50' : 'bg-white'
              )}
            >
              <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-gray-700 truncate">{s.mainText}</span>
                {s.secondaryText && (
                  <span className="block text-[11px] text-gray-400 truncate">{s.secondaryText}</span>
                )}
              </span>
            </button>
          ))}
          {loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
