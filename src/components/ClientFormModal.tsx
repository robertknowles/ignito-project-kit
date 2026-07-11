import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Edit2Icon, PlusIcon, Trash2Icon, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Client } from '@/contexts/ClientContext'
import {
  FormQuestion,
  TYPE_LABELS,
  getGlobalTemplate,
  getClientTemplate,
  saveClientTemplate,
} from '@/components/FormTemplateEditor'

// ---- Helpers ---------------------------------------------------------------

interface FormSubmission {
  id: number
  form_type: string
  status: string
  questions: any
  responses: any
}

const formatAnswer = (value: any, type: FormQuestion['type']): string => {
  if (value === null || value === undefined || value === '') return ''
  if (type === 'currency') return `$${Number(value).toLocaleString('en-AU')}`
  if (type === 'toggle') return value ? 'Yes' : 'No'
  if (type === 'years') return `${value} year${value === 1 ? '' : 's'}`
  return String(value)
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
        <button onClick={() => onMove('up')} disabled={idx === 0} className="p-1 text-[#717680] hover:text-[#414651] disabled:opacity-30 transition-colors">
          <ChevronUp size={14} />
        </button>
        <button onClick={() => onMove('down')} disabled={idx === total - 1} className="p-1 text-[#717680] hover:text-[#414651] disabled:opacity-30 transition-colors">
          <ChevronDown size={14} />
        </button>
        <button
          onClick={onToggle}
          className="px-2.5 py-1 text-xs font-medium text-[#414651] bg-white border border-[#D5D7DA] rounded-md hover:bg-[#F9FAFB] transition-colors"
        >
          {expanded ? 'Close' : 'Edit'}
        </button>
        <button onClick={onDelete} className="p-1 text-[#717680] hover:text-red-500 transition-colors">
          <Trash2Icon size={14} />
        </button>
      </div>
    </div>

    {expanded && (
      <div className="border-t border-[#E9EAEB] px-4 py-3 bg-[#F9FAFB] grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-sm font-medium text-[#414651] mb-1.5 block">Question label</label>
          <Input value={q.label} onChange={e => onUpdate({ label: e.target.value })} className="text-sm" />
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
          <Input value={q.section} onChange={e => onUpdate({ section: e.target.value })} className="text-sm" />
        </div>
        {(q.type === 'currency' || q.type === 'number' || q.type === 'years') && (
          <>
            <div>
              <label className="text-sm font-medium text-[#414651] mb-1.5 block">Min</label>
              <Input type="number" value={q.min ?? ''} onChange={e => onUpdate({ min: e.target.value !== '' ? Number(e.target.value) : undefined })} className="text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#414651] mb-1.5 block">Max</label>
              <Input type="number" value={q.max ?? ''} onChange={e => onUpdate({ max: e.target.value !== '' ? Number(e.target.value) : undefined })} className="text-sm" />
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
  client: Client
  formType: 'input_form' | 'profile_update'
}

export const ClientFormModal = ({ open, onOpenChange, client, formType }: Props) => {
  const [submission, setSubmission] = useState<FormSubmission | null>(null)
  const [questions, setQuestions] = useState<FormQuestion[]>([])
  const [editing, setEditing] = useState(false)
  const [editQuestions, setEditQuestions] = useState<FormQuestion[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setEditing(false)
    setExpandedId(null)

    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('form_submissions')
          .select('id, form_type, status, questions, responses')
          .eq('client_id', client.id)
          .eq('form_type', formType)
          .order('sent_at', { ascending: false })
          .limit(1)

        if (!error && data && data.length > 0) {
          const sub = data[0] as FormSubmission
          setSubmission(sub)
          const qs: FormQuestion[] = sub.questions || getClientTemplate(client.id) || getGlobalTemplate()
          setQuestions(qs)
          setEditQuestions(qs)
        } else {
          setSubmission(null)
          const qs = getClientTemplate(client.id) || getGlobalTemplate()
          setQuestions(qs)
          setEditQuestions(qs)
        }
      } catch {
        const qs = getGlobalTemplate()
        setQuestions(qs)
        setEditQuestions(qs)
      }
      setLoading(false)
    }

    load()
  }, [open, client.id, formType])

  const handleSaveEdits = async () => {
    setSaving(true)
    try {
      if (submission) {
        await supabase
          .from('form_submissions')
          .update({ questions: editQuestions })
          .eq('id', submission.id)
      }
      saveClientTemplate(client.id, editQuestions)
      setQuestions(editQuestions)
      setEditing(false)
      toast.success('Questions updated for this client')
    } catch {
      toast.error('Failed to save changes')
    }
    setSaving(false)
  }

  const updateQuestion = (id: string, changes: Partial<FormQuestion>) => {
    setEditQuestions(prev => prev.map(q => q.id === id ? { ...q, ...changes } : q))
  }

  const deleteQuestion = (id: string) => {
    setEditQuestions(prev => prev.filter(q => q.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const addQuestion = () => {
    const id = `q_${Date.now()}`
    const newQ: FormQuestion = { id, field: id, label: 'New question', type: 'text', section: 'General' }
    setEditQuestions(prev => [...prev, newQ])
    setExpandedId(id)
  }

  const moveQuestion = (id: string, dir: 'up' | 'down') => {
    const idx = editQuestions.findIndex(q => q.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === editQuestions.length - 1) return
    const next = [...editQuestions]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setEditQuestions(next)
  }

  const responses = submission?.responses || {}
  const formTitle = formType === 'input_form' ? 'Client Details Form' : 'Client Details Update'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between pr-6">
            <div>
              <DialogTitle>{formTitle}</DialogTitle>
              <DialogDescription className="mt-0.5">{client.name}</DialogDescription>
            </div>
            {!editing && !loading && (
              <button
                onClick={() => { setEditQuestions(questions); setEditing(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#414651] bg-white border border-[#D5D7DA] rounded-lg hover:bg-[#F9FAFB] transition-all duration-150 flex-shrink-0 mt-0.5"
              >
                <Edit2Icon size={13} />
                Edit questions
              </button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center">
            <span className="text-sm text-[#717680]">Loading...</span>
          </div>
        ) : !editing ? (
          /* ---- View mode ---- */
          <>
            <div className="divide-y divide-[#F2F4F7] -mt-1">
              {questions.length === 0 && (
                <p className="py-8 text-center text-sm text-[#717680]">No questions in this form.</p>
              )}
              {questions.map(q => {
                const rawVal = responses[q.field]
                const hasAnswer = rawVal !== null && rawVal !== undefined && rawVal !== ''
                return (
                  <div key={q.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-[#717680] uppercase tracking-wide mb-0.5">{q.section}</p>
                      <p className="text-sm font-medium text-[#414651]">{q.label}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {hasAnswer
                        ? <p className="text-sm font-semibold text-[#111827]">{formatAnswer(rawVal, q.type)}</p>
                        : <p className="text-sm text-[#D5D7DA]">-</p>
                      }
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2.5 text-sm font-semibold text-[#414651] bg-white border border-[#D5D7DA] rounded-lg hover:bg-[#F9FAFB] transition-all duration-150"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          /* ---- Edit mode ---- */
          <>
            <div className="space-y-2 -mt-1">
              {editQuestions.map((q, idx) => (
                <QuestionRow
                  key={q.id}
                  q={q}
                  idx={idx}
                  total={editQuestions.length}
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
                onClick={() => { setEditing(false); setEditQuestions(questions) }}
                className="px-4 py-2.5 text-sm font-semibold text-[#414651] bg-white border border-[#D5D7DA] rounded-lg hover:bg-[#F9FAFB] transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdits}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-[#535862] rounded-lg hover:bg-[#414651] disabled:opacity-50 transition-all duration-150"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
