import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Send,
  Clock,
  CheckCircle2,
  Eye,
  RotateCcw,
  SearchIcon,
  UserPlus,
  RefreshCw,
  ChevronDown,
  X,
} from 'lucide-react'
import { LeftRail } from '@/components/LeftRail'
import { HomeDrawer } from '@/components/HomeDrawer'
import { UnderlineTabBar } from '@/components/UnderlineTabBar'
import { useClient, Client } from '@/contexts/ClientContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ------ Predefined form templates ------

interface FormQuestion {
  id: string
  label: string
  field: string // maps to clients table column
  type: 'text' | 'number' | 'date' | 'select'
  options?: string[]
  section: string
}

interface FormTemplate {
  key: 'input_form' | 'profile_update'
  name: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  questions: FormQuestion[]
}

const INPUT_FORM_QUESTIONS: FormQuestion[] = [
  // Personal details
  { id: 'name', label: 'Full name', field: 'name', type: 'text', section: 'Personal details' },
  { id: 'email', label: 'Email address', field: 'email', type: 'text', section: 'Personal details' },
  { id: 'phone', label: 'Phone number', field: 'phone', type: 'text', section: 'Personal details' },
  { id: 'date_of_birth', label: 'Date of birth', field: 'date_of_birth', type: 'date', section: 'Personal details' },
  { id: 'address', label: 'Current address', field: 'address', type: 'text', section: 'Personal details' },
  { id: 'marital_status', label: 'Marital status', field: 'marital_status', type: 'select', options: ['Single', 'Married', 'De facto', 'Divorced', 'Widowed'], section: 'Personal details' },
  { id: 'dependants', label: 'Number of dependants', field: 'dependants', type: 'number', section: 'Personal details' },
  // Financial snapshot
  { id: 'employment', label: 'Employment type', field: 'employment', type: 'select', options: ['Full-time', 'Part-time', 'Casual', 'Self-employed', 'Contractor', 'Not employed'], section: 'Financial snapshot' },
  { id: 'annual_income', label: 'Annual income ($)', field: 'annual_income', type: 'number', section: 'Financial snapshot' },
  { id: 'partner_income', label: 'Partner annual income ($)', field: 'partner_income', type: 'number', section: 'Financial snapshot' },
  { id: 'available_savings', label: 'Available savings ($)', field: 'available_savings', type: 'number', section: 'Financial snapshot' },
  { id: 'borrowing_capacity', label: 'Borrowing capacity ($)', field: 'borrowing_capacity', type: 'number', section: 'Financial snapshot' },
  { id: 'pre_approval_status', label: 'Pre-approval status', field: 'pre_approval_status', type: 'select', options: ['Not started', 'In progress', 'Approved', 'Expired'], section: 'Financial snapshot' },
  // Investment preferences
  { id: 'risk_tolerance', label: 'Risk tolerance', field: 'risk_tolerance', type: 'select', options: ['Conservative', 'Moderate', 'Aggressive'], section: 'Investment preferences' },
  { id: 'primary_goal', label: 'Primary investment goal', field: 'primary_goal', type: 'select', options: ['Capital growth', 'Cash flow', 'Balanced', 'First home', 'Retirement planning'], section: 'Investment preferences' },
  { id: 'preferred_property_type', label: 'Preferred property type', field: 'preferred_property_type', type: 'select', options: ['House', 'Unit/Apartment', 'Townhouse', 'Land', 'Any'], section: 'Investment preferences' },
  { id: 'preferred_locations', label: 'Preferred locations', field: 'preferred_locations', type: 'text', section: 'Investment preferences' },
  { id: 'purchase_timeline', label: 'Purchase timeline', field: 'purchase_timeline', type: 'select', options: ['0-3 months', '3-6 months', '6-12 months', '12+ months', 'Not sure'], section: 'Investment preferences' },
]

const PROFILE_UPDATE_QUESTIONS: FormQuestion[] = [
  // Financial snapshot (most likely to change)
  { id: 'annual_income', label: 'Annual income ($)', field: 'annual_income', type: 'number', section: 'Financial snapshot' },
  { id: 'partner_income', label: 'Partner annual income ($)', field: 'partner_income', type: 'number', section: 'Financial snapshot' },
  { id: 'available_savings', label: 'Available savings ($)', field: 'available_savings', type: 'number', section: 'Financial snapshot' },
  { id: 'borrowing_capacity', label: 'Borrowing capacity ($)', field: 'borrowing_capacity', type: 'number', section: 'Financial snapshot' },
  { id: 'pre_approval_status', label: 'Pre-approval status', field: 'pre_approval_status', type: 'select', options: ['Not started', 'In progress', 'Approved', 'Expired'], section: 'Financial snapshot' },
  { id: 'pre_approval_expiry', label: 'Pre-approval expiry date', field: 'pre_approval_expiry', type: 'date', section: 'Financial snapshot' },
  // Personal changes
  { id: 'address', label: 'Current address', field: 'address', type: 'text', section: 'Personal details' },
  { id: 'marital_status', label: 'Marital status', field: 'marital_status', type: 'select', options: ['Single', 'Married', 'De facto', 'Divorced', 'Widowed'], section: 'Personal details' },
  { id: 'dependants', label: 'Number of dependants', field: 'dependants', type: 'number', section: 'Personal details' },
  // Preference updates
  { id: 'risk_tolerance', label: 'Risk tolerance', field: 'risk_tolerance', type: 'select', options: ['Conservative', 'Moderate', 'Aggressive'], section: 'Investment preferences' },
  { id: 'primary_goal', label: 'Primary investment goal', field: 'primary_goal', type: 'select', options: ['Capital growth', 'Cash flow', 'Balanced', 'First home', 'Retirement planning'], section: 'Investment preferences' },
  { id: 'preferred_property_type', label: 'Preferred property type', field: 'preferred_property_type', type: 'select', options: ['House', 'Unit/Apartment', 'Townhouse', 'Land', 'Any'], section: 'Investment preferences' },
  { id: 'preferred_locations', label: 'Preferred locations', field: 'preferred_locations', type: 'text', section: 'Investment preferences' },
  { id: 'purchase_timeline', label: 'Purchase timeline', field: 'purchase_timeline', type: 'select', options: ['0-3 months', '3-6 months', '6-12 months', '12+ months', 'Not sure'], section: 'Investment preferences' },
]

const FORM_TEMPLATES: FormTemplate[] = [
  {
    key: 'input_form',
    name: 'Input Form',
    description: 'Collect financial details and preferences from new clients during onboarding. Responses feed directly into the property plan.',
    icon: <UserPlus size={20} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    questions: INPUT_FORM_QUESTIONS,
  },
  {
    key: 'profile_update',
    name: 'Profile Update',
    description: 'Request updated financial details from existing clients during their 6-month review cycle.',
    icon: <RefreshCw size={20} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    questions: PROFILE_UPDATE_QUESTIONS,
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

  const [homeDrawerOpen, setHomeDrawerOpen] = useState(true)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(true)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'input_form' | 'profile_update'>('all')

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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s => {
        const client = clientMap[s.client_id]
        return client?.name.toLowerCase().includes(q) || client?.email?.toLowerCase().includes(q)
      })
    }

    return result
  }, [submissions, filterType, searchQuery, clientMap])

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
      setSendModalOpen(false)
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Open send modal for a specific template
  const openSendModal = (template: FormTemplate) => {
    setSelectedTemplate(template)
    setSelectedClientId(null)
    setSendModalOpen(true)
  }

  // Expanded question view per template
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)

  // Stats
  const formStats = useMemo(() => {
    const total = submissions.length
    const pending = submissions.filter(s => s.status === 'not_opened' || s.status === 'awaiting').length
    const completed = submissions.filter(s => s.status === 'completed').length
    return { total, pending, completed }
  }, [submissions])

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

  // Last modified dates (most recent sent_at per template)
  const lastModifiedDates = useMemo(() => {
    const dates: Record<string, string> = {}
    submissions.forEach(s => {
      if (!dates[s.form_type] || new Date(s.sent_at) > new Date(dates[s.form_type])) {
        dates[s.form_type] = s.sent_at
      }
    })
    return dates
  }, [submissions])

  return (
    <TooltipProvider>
      <div className="main-app flex h-screen w-full bg-[#f9fafb]">
        <LeftRail />
        <HomeDrawer isOpen={homeDrawerOpen} onToggle={() => setHomeDrawerOpen(o => !o)} />
        <div className={`flex-1 overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
          homeDrawerOpen ? 'ml-[calc(4rem+14rem)]' : 'ml-16'
        }`}>
          <div className="flex-1 overflow-auto">
            <div className="flex-1 overflow-auto p-8">
              {/* Header */}
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="page-title">Forms</h2>
                  <p className="body-secondary mt-0.5">Create, edit and send form templates to your clients</p>
                </div>
                <button className="flex items-center gap-2 px-3.5 py-2 bg-[#2563EB] text-white rounded-lg text-sm hover:bg-[#1d4ed8] transition-colors">
                  <FileText size={14} />
                  + New template
                </button>
              </div>

              {/* Form Template Cards */}
              <div className="grid grid-cols-2 gap-4 mb-8 mt-6">
                {FORM_TEMPLATES.map(template => {
                  const isInputForm = template.key === 'input_form'
                  const badgeLabel = isInputForm ? 'Onboarding' : '6-month review'
                  const badgeColor = isInputForm ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                  const borderColor = isInputForm ? 'border-orange-300' : 'border-blue-300'
                  const awaiting = awaitingCounts[template.key] || 0
                  const lastModified = lastModifiedDates[template.key]
                  const isExpanded = expandedTemplate === template.key

                  return (
                    <div
                      key={template.key}
                      className={`bg-white border rounded-lg p-5 hover:border-gray-300 transition-colors ${borderColor}`}
                    >
                      {/* Top row: name + badge + awaiting */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="section-heading">{template.name}</h3>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                          <span className="meta">{template.questions.length} questions</span>
                        </div>
                        {awaiting > 0 && (
                          <span className="text-[11px] font-medium text-amber-700">
                            {awaiting} awaiting
                          </span>
                        )}
                      </div>

                      <p className="meta leading-relaxed mb-3">
                        {template.description}
                      </p>

                      {/* Last modified + action buttons */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="meta">
                          Last modified {lastModified
                            ? new Date(lastModified).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'
                          }
                        </span>
                        <button className="text-xs text-[#374151] border border-gray-200 px-2.5 py-1 rounded hover:bg-gray-50 transition-colors">
                          Edit questions
                        </button>
                        <button className="text-xs text-[#374151] border border-gray-200 px-2.5 py-1 rounded hover:bg-gray-50 transition-colors">
                          Preview
                        </button>
                        <button
                          onClick={() => setExpandedTemplate(isExpanded ? null : template.key)}
                          className="text-xs text-[#2563EB] font-medium flex items-center gap-1"
                        >
                          View questions {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>

                      {/* Expandable question list */}
                      {isExpanded && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          {Array.from(new Set(template.questions.map(q => q.section))).map(section => (
                            <div key={section} className="mb-2 last:mb-0">
                              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{section}</div>
                              <div className="space-y-0.5">
                                {template.questions.filter(q => q.section === section).map(q => (
                                  <div key={q.id} className="text-xs text-[#374151]">• {q.label}</div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline send-to */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <span className="meta whitespace-nowrap">Send to:</span>
                        <select
                          className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 text-[#374151] bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                          value={selectedTemplate?.key === template.key && selectedClientId ? selectedClientId : ''}
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
                            if (selectedTemplate?.key === template.key && selectedClientId) {
                              handleSendForm()
                            }
                          }}
                          disabled={!selectedClientId || selectedTemplate?.key !== template.key || sending}
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
                      const label = key === 'all' ? 'All' : key === 'input_form' ? 'Input Form' : 'Profile Update'
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
                        const formType = submission.form_type === 'input_form' ? 'Input Form' : 'Profile Update'
                        const status = statusConfig[submission.status] || statusConfig.not_opened

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

      {/* Send Form Modal */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Send {selectedTemplate?.name || 'Form'}
            </DialogTitle>
            <DialogDescription>
              Select a client to send this form to. They will receive a notification to complete it.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Template info */}
            {selectedTemplate && (
              <div className={`flex items-center gap-3 p-3 rounded-lg ${selectedTemplate.bgColor} mb-4`}>
                <div className={selectedTemplate.color}>{selectedTemplate.icon}</div>
                <div>
                  <div className={`body-dark font-medium ${selectedTemplate.color}`}>
                    {selectedTemplate.name}
                  </div>
                  <div className="meta">
                    {selectedTemplate.questions.length} questions
                  </div>
                </div>
              </div>
            )}

            {/* Client selector */}
            <label className="block body-dark font-medium mb-2">
              Select client
            </label>
            <div className="space-y-1.5 max-h-60 overflow-auto border border-gray-200 rounded-lg p-1.5">
              {clients.length === 0 ? (
                <div className="body-secondary text-center py-4">
                  No clients found
                </div>
              ) : (
                clients.map(client => {
                  const initials = client.name
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                  const isSelected = selectedClientId === client.id

                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-[#2563EB] bg-opacity-10 border border-[#2563EB] border-opacity-30'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-[#2563EB] bg-opacity-60 flex items-center justify-center text-white text-xs flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="body-dark font-medium truncate">
                          {client.name}
                        </div>
                        {client.email && (
                          <div className="meta truncate">
                            {client.email}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={16} className="text-[#2563EB] flex-shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSendModalOpen(false)
                setSelectedTemplate(null)
                setSelectedClientId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendForm}
              disabled={!selectedClientId || sending}
              className="bg-[#2563EB] hover:bg-[#1d4ed8]"
            >
              {sending ? 'Sending...' : 'Send Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
