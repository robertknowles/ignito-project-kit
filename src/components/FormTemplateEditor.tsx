import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusIcon, Trash2Icon, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

// ---- Types ----------------------------------------------------------------

export interface FormQuestion {
  id: string
  field: string
  label: string
  type: 'currency' | 'years' | 'toggle' | 'text' | 'number' | 'select'
  min?: number
  max?: number
  step?: number
  section: string
  options?: string[]
}

export const TYPE_LABELS: Record<FormQuestion['type'], string> = {
  currency: 'Currency (AUD)',
  years: 'Years',
  toggle: 'Yes / No',
  text: 'Short text',
  number: 'Number',
  select: 'Dropdown',
}

// ---- Storage helpers -------------------------------------------------------

const GLOBAL_KEY = 'ignito_form_template_global'
const clientKey = (clientId: number) => `ignito_form_template_client_${clientId}`

const DEFAULT_QUESTIONS: FormQuestion[] = [
  { id: 'depositPool', field: 'depositPool', label: 'Available deposit', type: 'currency', min: 10000, max: 500000, step: 5000, section: 'Financial details' },
  { id: 'borrowingCapacity', field: 'borrowingCapacity', label: 'Borrowing capacity', type: 'currency', min: 100000, max: 2000000, step: 25000, section: 'Financial details' },
  { id: 'annualSavings', field: 'annualSavings', label: 'Annual savings', type: 'currency', min: 0, max: 100000, step: 2000, section: 'Financial details' },
  { id: 'portfolioValue', field: 'portfolioValue', label: 'Current property value', type: 'currency', min: 0, max: 5000000, step: 25000, section: 'Financial details' },
  { id: 'currentDebt', field: 'currentDebt', label: 'Current investment debt', type: 'currency', min: 0, max: 4000000, step: 25000, section: 'Financial details' },
  { id: 'timelineYears', field: 'timelineYears', label: 'Investment horizon', type: 'years', min: 5, max: 20, step: 1, section: 'Investment goals' },
  { id: 'equityGoal', field: 'equityGoal', label: 'Equity goal', type: 'currency', min: 0, max: 5000000, step: 50000, section: 'Investment goals' },
  { id: 'cashflowGoal', field: 'cashflowGoal', label: 'Annual cashflow goal', type: 'currency', min: 0, max: 200000, step: 5000, section: 'Investment goals' },
  { id: 'useExistingEquity', field: 'useExistingEquity', label: 'Use existing equity', type: 'toggle', section: 'Investment goals' },
]

export const getGlobalTemplate = (): FormQuestion[] => {
  try {
    const stored = localStorage.getItem(GLOBAL_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return DEFAULT_QUESTIONS
}

export const saveGlobalTemplate = (questions: FormQuestion[]) => {
  localStorage.setItem(GLOBAL_KEY, JSON.stringify(questions))
}

export const getClientTemplate = (clientId: number): FormQuestion[] | null => {
  try {
    const stored = localStorage.getItem(clientKey(clientId))
    if (stored) return JSON.parse(stored)
  } catch {}
  return null
}

export const saveClientTemplate = (clientId: number, questions: FormQuestion[]) => {
  localStorage.setItem(clientKey(clientId), JSON.stringify(questions))
}

// ---- Question editor row --------------------------------------------------

interface QuestionRowProps {
  q: FormQuestion
  idx: number
  total: number
  expanded: boolean
  onToggle: () => void
  onUpdate: (changes: Partial<FormQuestion>) => void
  onDelete: () => void
  onMove: (dir: 'up' | 'down') => void
}

const QuestionRow = ({ q, idx, total, expanded, onToggle, onUpdate, onDelete, onMove }: QuestionRowProps) => (
  <div className="border border-[#E9EAEB] rounded-lg overflow-hidden">
    <div className="flex items-center gap-2 px-3 py-2.5 bg-white">
      <GripVertical size={14} className="text-[#D5D7DA] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-[#414651] truncate block">{q.label}</span>
        <span className="text-xs text-[#717680]">{TYPE_LABELS[q.type]} · {q.section}</span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onMove('up')}
          disabled={idx === 0}
          className="p-1 text-[#717680] hover:text-[#414651] disabled:opacity-30 transition-colors"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={() => onMove('down')}
          disabled={idx === total - 1}
          className="p-1 text-[#717680] hover:text-[#414651] disabled:opacity-30 transition-colors"
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={onToggle}
          className="px-2.5 py-1 text-xs font-medium text-[#414651] bg-white border border-[#D5D7DA] rounded-md hover:bg-[#F9FAFB] transition-colors"
        >
          {expanded ? 'Close' : 'Edit'}
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-[#717680] hover:text-red-500 transition-colors"
        >
          <Trash2Icon size={14} />
        </button>
      </div>
    </div>

    {expanded && (
      <div className="border-t border-[#E9EAEB] px-4 py-3 bg-[#F9FAFB] grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-sm font-medium text-[#414651] mb-1.5 block">Question label</label>
          <Input
            value={q.label}
            onChange={e => onUpdate({ label: e.target.value })}
            className="text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#414651] mb-1.5 block">Type</label>
          <select
            value={q.type}
            onChange={e => onUpdate({ type: e.target.value as FormQuestion['type'] })}
            className="w-full px-3.5 py-2.5 border border-[#D5D7DA] rounded-lg text-sm text-[#414651] focus:outline-none focus:ring-2 focus:ring-[#535862] focus:ring-offset-1 focus:border-transparent bg-white"
          >
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-[#414651] mb-1.5 block">Section</label>
          <Input
            value={q.section}
            onChange={e => onUpdate({ section: e.target.value })}
            className="text-sm"
          />
        </div>
        {(q.type === 'currency' || q.type === 'number' || q.type === 'years') && (
          <>
            <div>
              <label className="text-sm font-medium text-[#414651] mb-1.5 block">Min</label>
              <Input
                type="number"
                value={q.min ?? ''}
                onChange={e => onUpdate({ min: e.target.value !== '' ? Number(e.target.value) : undefined })}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#414651] mb-1.5 block">Max</label>
              <Input
                type="number"
                value={q.max ?? ''}
                onChange={e => onUpdate({ max: e.target.value !== '' ? Number(e.target.value) : undefined })}
                className="text-sm"
              />
            </div>
          </>
        )}
        {q.type === 'select' && (
          <div className="col-span-2">
            <label className="text-sm font-medium text-[#414651] mb-1.5 block">Options (one per line)</label>
            <textarea
              value={(q.options || []).join('\n')}
              onChange={e => onUpdate({ options: e.target.value.split('\n').filter(Boolean) })}
              rows={4}
              className="w-full px-3.5 py-2.5 border border-[#D5D7DA] rounded-lg text-sm text-[#414651] focus:outline-none focus:ring-2 focus:ring-[#535862] focus:ring-offset-1 focus:border-transparent resize-none"
              placeholder={'Option 1\nOption 2\nOption 3'}
            />
          </div>
        )}
      </div>
    )}
  </div>
)

// ---- Main component -------------------------------------------------------

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const FormTemplateEditor = ({ open, onOpenChange }: Props) => {
  const [questions, setQuestions] = useState<FormQuestion[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setQuestions(getGlobalTemplate())
      setExpandedId(null)
    }
  }, [open])

  const handleSave = () => {
    saveGlobalTemplate(questions)
    toast.success('Form template saved')
    onOpenChange(false)
  }

  const addQuestion = () => {
    const id = `q_${Date.now()}`
    const newQ: FormQuestion = { id, field: id, label: 'New question', type: 'text', section: 'General' }
    setQuestions(prev => [...prev, newQ])
    setExpandedId(id)
  }

  const updateQuestion = (id: string, changes: Partial<FormQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...changes } : q))
  }

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const moveQuestion = (id: string, dir: 'up' | 'down') => {
    const idx = questions.findIndex(q => q.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === questions.length - 1) return
    const next = [...questions]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setQuestions(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Form Template</DialogTitle>
          <DialogDescription>
            Customise the questions sent to all new clients. Changes apply to future sends only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-1">
          {questions.map((q, idx) => (
            <QuestionRow
              key={q.id}
              q={q}
              idx={idx}
              total={questions.length}
              expanded={expandedId === q.id}
              onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
              onUpdate={changes => updateQuestion(q.id, changes)}
              onDelete={() => deleteQuestion(q.id)}
              onMove={dir => moveQuestion(q.id, dir)}
            />
          ))}

          <button
            onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#D5D7DA] rounded-lg text-sm text-[#717680] hover:border-[#535862] hover:text-[#414651] hover:bg-[#F9FAFB] transition-all"
          >
            <PlusIcon size={14} />
            Add question
          </button>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2.5 text-sm font-semibold text-[#414651] bg-white border border-[#D5D7DA] rounded-lg hover:bg-[#F9FAFB] transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-[#535862] rounded-lg hover:bg-[#414651] transition-all duration-150"
          >
            Save template
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
