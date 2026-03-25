import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FileText,
  Clock,
  CheckCircle2,
  Eye,
  UserPlus,
  RefreshCw,
} from 'lucide-react'
import { LeftRail } from '@/components/LeftRail'
import { useClient, Client } from '@/contexts/ClientContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import {
  TooltipProvider,
} from '@/components/ui/tooltip'

// ------ Standardised fields (what the calculation engine actually uses) ------

interface StandardField {
  key: string
  label: string
  updateLabel: string
  type: 'currency' | 'years' | 'toggle'
  min?: number
  max?: number
  step?: number
  section: string
}

const STANDARD_FIELDS: StandardField[] = [
  { key: 'depositPool', label: 'Available deposit', updateLabel: 'Current available deposit', type: 'currency', min: 10000, max: 500000, step: 5000, section: 'Financial details' },
  { key: 'borrowingCapacity', label: 'Borrowing capacity', updateLabel: 'Updated borrowing capacity', type: 'currency', min: 100000, max: 2000000, step: 25000, section: 'Financial details' },
  { key: 'annualSavings', label: 'Annual savings', updateLabel: 'Current annual savings', type: 'currency', min: 0, max: 100000, step: 2000, section: 'Financial details' },
  { key: 'portfolioValue', label: 'Current property value', updateLabel: 'Current property value', type: 'currency', min: 0, max: 5000000, step: 25000, section: 'Financial details' },
  { key: 'currentDebt', label: 'Current investment debt', updateLabel: 'Current investment debt', type: 'currency', min: 0, max: 4000000, step: 25000, section: 'Financial details' },
  { key: 'timelineYears', label: 'Investment horizon', updateLabel: 'Updated investment horizon', type: 'years', min: 5, max: 20, step: 1, section: 'Investment goals' },
  { key: 'equityGoal', label: 'Equity goal', updateLabel: 'Updated equity goal', type: 'currency', min: 0, max: 5000000, step: 50000, section: 'Investment goals' },
  { key: 'cashflowGoal', label: 'Annual cashflow goal', updateLabel: 'Updated cashflow goal', type: 'currency', min: 0, max: 200000, step: 5000, section: 'Investment goals' },
  { key: 'useExistingEquity', label: 'Use existing equity', updateLabel: 'Use existing equity', type: 'toggle', section: 'Investment goals' },
]

interface FormQuestion {
  id: string
  label: string
  field: string
  type: 'currency' | 'years' | 'toggle'
  min?: number
  max?: number
  step?: number
  section: string
}

interface FormTemplate {
  key: 'input_form' | 'profile_update'
  name: string
  description: string
  icon: React.ReactNode
  questions: FormQuestion[]
}

const buildQuestions = (isUpdate: boolean): FormQuestion[] =>
  STANDARD_FIELDS.map(f => ({
    id: f.key,
    field: f.key,
    label: isUpdate ? f.updateLabel : f.label,
    type: f.type,
    min: f.min,
    max: f.max,
    step: f.step,
    section: f.section,
  }))

const FORM_TEMPLATES: FormTemplate[] = [
  {
    key: 'input_form',
    name: 'Client Details Form',
    description: 'Collect financial details from new clients to build their investment roadmap.',
    icon: <UserPlus size={20} />,
    questions: buildQuestions(false),
  },
  {
    key: 'profile_update',
    name: 'Client Details Update',
    description: 'Request updated financial details during a client\'s 6-month review cycle.',
    icon: <RefreshCw size={20} />,
    questions: buildQuestions(true),
  },
]

// ------ Submission record type ------
interface FormSubmission {
  id: number
  client_id: number
  form_type: string
  status: string
  sent_at: string
  opened_at: string | null
  completed_at: string | null
  sent_by: string | null
  questions: any
  responses: any
}

// ------ Main component ------
export const AgentForms = () => {
  const { clients } = useClient()
  const { user, companyId } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'input_form' | 'profile_update'>('all')

  // Read URL params and pre-select template/client
  useEffect(() => {
    const typeParam = searchParams.get('type')
    const clientParam = searchParams.get('client')

    if (typeParam) {
      const template = FORM_TEMPLATES.find(t => t.key === typeParam)
      if (template) setSelectedTemplate(template)
    }
    if (clientParam) {
      const clientId = Number(clientParam)
      if (!isNaN(clientId)) setSelectedClientId(clientId)
    }

    // Clear URL params after reading so they don't persist on refresh
    if (typeParam || clientParam) {
      setSearchParams({}, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch sent forms
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const { data, error } = await supabase
          .from('form_submissions')
          .select('id, client_id, form_type, status, sent_at, opened_at, completed_at, sent_by, questions, responses')
          .order('sent_at', { ascending: false })

        if (!error && data) {
          setSubmissions(data as FormSubmission[])
        }
      } catch {
        // Fetch failed silently
      }
      setSubmissionsLoading(false)
    }

    fetchSubmissions()
  }, [])

  // Client lookup map
  const clientMap = useMemo(() => {
    const map: Record<number, Client> = {}
    clients.forEach(c => { map[c.id] = c })
    return map
  }, [clients])

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    let result = submissions

    if (filterType !== 'all') {
      result = result.filter(s => s.form_type === filterType)
    }

    return result
  }, [submissions, filterType])

  // Send form to client
  const handleSendForm = async () => {
    if (!selectedTemplate || !selectedClientId || !user) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('form_submissions')
        .insert({
          client_id: selectedClientId,
          company_id: companyId,
          sent_by: user.id,
          form_type: selectedTemplate.key,
          questions: selectedTemplate.questions,
          status: 'not_opened',
          sent_at: new Date().toISOString(),
        })

      if (error) throw error

      // Log activity
      await supabase.from('activity_log').insert({
        client_id: selectedClientId,
        company_id: companyId,
        actor_id: user.id,
        event_type: 'form_sent',
        metadata: {
          form_type: selectedTemplate.key,
          form_name: selectedTemplate.name,
        },
      })

      // Refresh submissions
      const { data } = await supabase
        .from('form_submissions')
        .select('id, client_id, form_type, status, sent_at, opened_at, completed_at, sent_by, questions, responses')
        .order('sent_at', { ascending: false })

      if (data) setSubmissions(data as FormSubmission[])

      toast.success(`${selectedTemplate.name} sent to ${clientMap[selectedClientId]?.name || 'client'}!`)
      setSelectedTemplate(null)
      setSelectedClientId(null)
    } catch {
      toast.error('Failed to send form')
    }
    setSending(false)
  }

  // Resend a form
  const handleResend = async (submission: FormSubmission) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('form_submissions')
        .insert({
          client_id: submission.client_id,
          company_id: companyId,
          sent_by: user.id,
          form_type: submission.form_type,
          questions: submission.questions,
          status: 'not_opened',
          sent_at: new Date().toISOString(),
        })

      if (error) throw error

      // Refresh
      const { data } = await supabase
        .from('form_submissions')
        .select('id, client_id, form_type, status, sent_at, opened_at, completed_at, sent_by, questions, responses')
        .order('sent_at', { ascending: false })

      if (data) setSubmissions(data as FormSubmission[])
      toast.success('Form resent!')
    } catch {
      toast.error('Failed to resend form')
    }
  }

  // Status display config
  const statusConfig: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
    not_opened: {
      label: 'Not opened',
      icon: <Clock size={12} />,
      bg: 'bg-gray-50',
      text: 'text-gray-600',
    },
    awaiting: {
      label: 'Awaiting',
      icon: <Eye size={12} />,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
    completed: {
      label: 'Completed',
      icon: <CheckCircle2 size={12} />,
      bg: 'bg-green-50',
      text: 'text-green-700',
    },
  }

  // Awaiting counts per template
  const awaitingCounts = useMemo(() => {
    const counts: Record<string, number> = { input_form: 0, profile_update: 0 }
    submissions.forEach(s => {
      if (s.status === 'awaiting' || s.status === 'not_opened') {
        counts[s.form_type] = (counts[s.form_type] || 0) + 1
      }
    })
    return counts
  }, [submissions])

  return (
    <TooltipProvider>
      <div className="main-app flex h-screen w-full bg-[#f9fafb]">
        <LeftRail />
        <div className="flex-1 overflow-hidden flex flex-col ml-16">
          <div className="flex-1 overflow-auto">
            <div className="flex-1 overflow-auto p-8">
              {/* Header */}
              <div className="mb-2">
                <h2 className="page-title">Forms</h2>
                <p className="body-secondary mt-0.5">Send client details forms or updates to your clients</p>
              </div>

              {/* Form Template Cards */}
              <div className="grid grid-cols-2 gap-4 mb-8 mt-6">
                {FORM_TEMPLATES.map(template => {
                  const isInputForm = template.key === 'input_form'
                  const badgeLabel = isInputForm ? 'Onboarding' : '6-month review'
                  const badgeColor = isInputForm ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                  const isSelected = selectedTemplate?.key === template.key
                  const borderColor = isSelected
                    ? 'border-[#2563EB] ring-1 ring-[#2563EB]/20'
                    : isInputForm ? 'border-orange-300' : 'border-blue-300'
                  const awaiting = awaitingCounts[template.key] || 0
                  const questionCount = template.questions.filter(q => q.type !== 'toggle').length

                  return (
                    <div
                      key={template.key}
                      className={`bg-white border rounded-lg p-5 transition-all ${borderColor}`}
                    >
                      {/* Top: name + badge + count */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="section-heading">{template.name}</h3>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                          <span className="meta">{questionCount} questions</span>
                        </div>
                        {awaiting > 0 && (
                          <span className="text-[11px] font-medium text-amber-700">
                            {awaiting} awaiting
                          </span>
                        )}
                      </div>

                      <p className="meta leading-relaxed mb-4">
                        {template.description}
                      </p>

                      {/* Send section */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <span className="meta whitespace-nowrap">Send to:</span>
                        <select
                          className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 text-[#374151] bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                          value={isSelected && selectedClientId ? selectedClientId : ''}
                          onChange={(e) => {
                            setSelectedTemplate(template)
                            setSelectedClientId(e.target.value ? Number(e.target.value) : null)
                          }}
                        >
                          <option value="">Select client...</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            if (isSelected && selectedClientId) {
                              handleSendForm()
                            }
                          }}
                          disabled={!selectedClientId || !isSelected || sending}
                          className="text-sm text-[#6b7280] hover:text-[#374151] whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Send {template.name} →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Send History */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="section-heading">Send history</h3>
                    <span className="text-xs text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                      {submissions.length} forms sent
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Filter pills */}
                    {(['all', 'input_form', 'profile_update'] as const).map(key => {
                      const label = key === 'all' ? 'All' : key === 'input_form' ? 'Details Form' : 'Details Update'
                      const isActive = filterType === key
                      return (
                        <button
                          key={key}
                          onClick={() => setFilterType(key)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                            isActive
                              ? 'bg-[#2563EB] text-white border-[#2563EB]'
                              : 'bg-white text-[#374151] border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="table-header">Client</th>
                        <th className="table-header">Form</th>
                        <th className="table-header">Sent</th>
                        <th className="table-header">Opened</th>
                        <th className="table-header">Status</th>
                        <th className="table-header">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissionsLoading ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center body-secondary">
                            Loading...
                          </td>
                        </tr>
                      ) : filteredSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center">
                            <FileText size={32} className="text-gray-300 mx-auto mb-3" />
                            <p className="body-secondary">
                              {submissions.length === 0
                                ? 'No forms sent yet'
                                : 'No forms match your filters'
                              }
                            </p>
                            {submissions.length === 0 && (
                              <p className="meta mt-1">
                                Send a form to a client to get started
                              </p>
                            )}
                          </td>
                        </tr>
                      ) : filteredSubmissions.map(submission => {
                        const client = clientMap[submission.client_id]
                        const AVATAR_COLORS = ['#2563EB', '#D97706', '#059669', '#DC2626', '#7C3AED', '#0891B2', '#EA580C', '#4F46E5']
                        const getAvatarColor = (name: string) => {
                          let hash = 0
                          for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
                          return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
                        }
                        const initials = client
                          ? client.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                          : '??'
                        const avatarColor = client ? getAvatarColor(client.name) : '#6b7280'
                        const formType = submission.form_type === 'input_form' ? 'Client Details Form' : 'Client Details Update'

                        return (
                          <tr key={submission.id} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                            <td className="table-cell">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0"
                                  style={{ backgroundColor: avatarColor }}
                                >
                                  {initials}
                                </div>
                                <div className="body-dark font-medium">
                                  {client?.name || 'Unknown'}
                                </div>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="text-sm text-[#374151]">
                                {formType}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="text-sm text-[#374151]">
                                {new Date(submission.sent_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                              </span>
                            </td>
                            <td className="table-cell">
                              {submission.opened_at
                                ? <span className="text-sm text-[#374151]">
                                    {new Date(submission.opened_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                  </span>
                                : <span className="meta">—</span>
                              }
                            </td>
                            <td className="table-cell">
                              {submission.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
                                  <CheckCircle2 size={12} />
                                  Completed
                                </span>
                              ) : submission.status === 'awaiting' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Awaiting
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                  Not opened
                                </span>
                              )}
                            </td>
                            <td className="table-cell">
                              {submission.status === 'completed' ? (
                                <button className="text-xs font-medium text-[#2563EB] hover:underline">
                                  View
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleResend(submission)}
                                  className="text-xs font-medium text-[#374151] border border-gray-200 px-2.5 py-1 rounded hover:bg-gray-50 transition-colors"
                                >
                                  Resend
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filteredSubmissions.length > 0 && (
                    <div className="px-5 py-3 border-t border-gray-100">
                      <span className="meta">
                        Sorted by most recently sent · showing {filteredSubmissions.length} record{filteredSubmissions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
