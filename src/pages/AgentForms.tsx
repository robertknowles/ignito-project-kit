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

  // Stats
  const formStats = useMemo(() => {
    const total = submissions.length
    const pending = submissions.filter(s => s.status === 'not_opened' || s.status === 'awaiting').length
    const completed = submissions.filter(s => s.status === 'completed').length
    return { total, pending, completed }
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="page-title">Forms</h2>
                <div className="flex items-center gap-3 body-secondary">
                  <span>{formStats.total} sent</span>
                  <span className="text-gray-300">|</span>
                  <span>{formStats.pending} pending</span>
                  <span className="text-gray-300">|</span>
                  <span>{formStats.completed} completed</span>
                </div>
              </div>

              {/* Form Template Cards */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {FORM_TEMPLATES.map(template => (
                  <div
                    key={template.key}
                    className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${template.bgColor} flex items-center justify-center ${template.color}`}>
                          {template.icon}
                        </div>
                        <div>
                          <h3 className="section-heading">{template.name}</h3>
                          <p className="meta">
                            {template.questions.length} questions
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => openSendModal(template)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white text-sm rounded-lg hover:bg-[#1d4ed8] transition-colors"
                      >
                        <Send size={14} />
                        Send
                      </button>
                    </div>
                    <p className="meta leading-relaxed">
                      {template.description}
                    </p>

                    {/* Question sections preview */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      {Array.from(new Set(template.questions.map(q => q.section))).map(section => (
                        <span
                          key={section}
                          className="text-[10px] font-medium text-[#9ca3af] bg-gray-50 px-2 py-0.5 rounded"
                        >
                          {section}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Send History */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-heading">Send History</h3>
                  <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by client..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-4 py-1.5 border border-[#f3f4f6] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] w-48"
                      />
                      <SearchIcon
                        size={14}
                        className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-[#6b7280]"
                      />
                    </div>
                    {/* Filter by type */}
                    <UnderlineTabBar
                      tabs={[
                        { key: 'all', label: 'All' },
                        { key: 'input_form', label: 'Input Form' },
                        { key: 'profile_update', label: 'Profile Update' },
                      ]}
                      activeKey={filterType}
                      onChange={(key) => setFilterType(key as typeof filterType)}
                    />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="table-header">Client</th>
                        <th className="table-header">Form</th>
                        <th className="table-header">Status</th>
                        <th className="table-header">Sent</th>
                        <th className="table-header">Completed</th>
                        <th className="table-header"></th>
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
                        const initials = client
                          ? client.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                          : '??'
                        const formType = submission.form_type === 'input_form' ? 'Input Form' : 'Profile Update'
                        const formColor = submission.form_type === 'input_form' ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'
                        const status = statusConfig[submission.status] || statusConfig.not_opened

                        return (
                          <tr key={submission.id} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                            <td className="table-cell">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-[#2563EB] bg-opacity-60 flex items-center justify-center text-white text-xs flex-shrink-0">
                                  {initials}
                                </div>
                                <div className="body-dark font-medium">
                                  {client?.name || 'Unknown'}
                                </div>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${formColor}`}>
                                {formType}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                {status.icon}
                                {status.label}
                              </span>
                            </td>
                            <td className="table-cell">
                              <div className="body-dark">{formatDate(submission.sent_at)}</div>
                              <div className="meta">{formatTime(submission.sent_at)}</div>
                            </td>
                            <td className="table-cell">
                              {submission.completed_at
                                ? formatDate(submission.completed_at)
                                : <span className="meta">--</span>
                              }
                            </td>
                            <td className="table-cell">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleResend(submission)}
                                    className="p-1.5 text-[#6b7280] hover:text-[#2563EB] hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Resend form</p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
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
