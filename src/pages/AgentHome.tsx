import React, { useState, useEffect, useMemo } from 'react'
import {
  CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  Target,
  CalendarCheck,
  AlertTriangle,
  UserPlus,
  Send,
  FileText,
  CheckCircle2,
  Eye,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LeftRail } from '@/components/LeftRail'
// HomeDrawer removed — navigation restructured to LeftRail only
import { useClient, Client } from '@/contexts/ClientContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBranding } from '@/contexts/BrandingContext'
import { StatCard } from '@/components/StatCard'
import { supabase } from '@/integrations/supabase/client'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

// Activity log entry from database
interface ActivityEntry {
  id: number
  client_id: number
  event_type: string
  metadata: Record<string, any> | null
  created_at: string
}

// Form submission record for meeting prep
interface FormSubmissionStatus {
  client_id: number
  form_type: string
  status: string
  sent_at: string
}

const AVATAR_BG = '#535862'
const AVATAR_TEXT = '#FFFFFF'

export const AgentHome = () => {
  const navigate = useNavigate()
  const { clients, activeSeats, seatLimit, updateClient } = useClient()
  const { user, role } = useAuth()
  const { branding } = useBranding()
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [formStatuses, setFormStatuses] = useState<FormSubmissionStatus[]>([])
  const [dashboardStatuses, setDashboardStatuses] = useState<Record<number, { hasProperties: boolean; shareId: string | null }>>({})
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [editingReviewClientId, setEditingReviewClientId] = useState<number | null>(null)
  const [editingNameClientId, setEditingNameClientId] = useState<number | null>(null)
  const [sendFormOpen, setSendFormOpen] = useState(false)
  const [sendFormType, setSendFormType] = useState<'input_form' | 'profile_update'>('input_form')
  const [sendFormClientId, setSendFormClientId] = useState<number | null>(null)
  const [sendingForm, setSendingForm] = useState(false)

  const today = new Date()
  const dateString = today.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Fetch recent activity (last 7 days)
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data, error } = await supabase
          .from('activity_log')
          .select('id, client_id, event_type, metadata, created_at')
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(20)

        if (!error && data) {
          setActivityLog(data as ActivityEntry[])
        }
      } catch {
        // Activity fetch failed silently
      }
      setActivityLoading(false)
    }

    fetchActivity()
  }, [])

  // Fetch form submission statuses for all clients
  useEffect(() => {
    const fetchFormStatuses = async () => {
      try {
        const { data, error } = await supabase
          .from('form_submissions')
          .select('client_id, form_type, status, sent_at')
          .order('sent_at', { ascending: false })

        if (!error && data) {
          setFormStatuses(data as FormSubmissionStatus[])
        }
      } catch {
        // Silently fail
      }
    }

    fetchFormStatuses()
  }, [])

  // Fetch dashboard/scenario statuses for all clients
  useEffect(() => {
    const fetchDashboardStatuses = async () => {
      if (clients.length === 0) return
      try {
        const { data, error } = await supabase
          .from('scenarios')
          .select('client_id, share_id, data')
          .in('client_id', clients.map(c => c.id))

        if (!error && data) {
          const map: Record<number, { hasProperties: boolean; shareId: string | null }> = {}
          data.forEach((s: any) => {
            const d = s.data as any
            const hasProps = d?.propertySelections && Object.keys(d.propertySelections).length > 0
            // Keep the most complete scenario per client
            if (!map[s.client_id] || hasProps) {
              map[s.client_id] = { hasProperties: hasProps, shareId: s.share_id }
            }
          })
          setDashboardStatuses(map)
        }
      } catch {
        // Silently fail
      }
    }

    fetchDashboardStatuses()
  }, [clients])

  // --- Stats ---
  const stats = useMemo(() => {
    const activeClients = clients.filter(c => c.roadmap_status && c.roadmap_status !== 'not_started').length || clients.length

    // Upcoming reviews: clients with review date within next 30 days
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const reviewsDueThisMonth = clients.filter(c => {
      if (!c.next_review_date) return false
      const d = new Date(c.next_review_date)
      return d <= thirtyDaysFromNow
    })

    // Find the next upcoming review date
    const nextReviewClient = [...clients]
      .filter(c => c.next_review_date && new Date(c.next_review_date) >= today)
      .sort((a, b) => new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime())[0]

    const nextReviewStr = nextReviewClient
      ? new Date(nextReviewClient.next_review_date!).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
      : null

    // Awaiting client input: clients with outstanding form submissions
    const awaitingInput = clients.filter(c => {
      const clientForms = formStatuses.filter(f => f.client_id === c.id)
      return clientForms.some(f => f.status === 'not_opened' || f.status === 'awaiting')
    }).length

    return { activeClients, reviewsDueThisMonth: reviewsDueThisMonth.length, awaitingInput, nextReviewStr }
  }, [clients, formStatuses, today])

  // --- Per-client form status lookup ---
  const clientFormStatusMap = useMemo(() => {
    const map: Record<number, { input_form: string | null; profile_update: string | null }> = {}
    clients.forEach(c => {
      const clientForms = formStatuses.filter(f => f.client_id === c.id)
      // Get latest status per form type
      const inputForm = clientForms.find(f => f.form_type === 'input_form')
      const profileUpdate = clientForms.find(f => f.form_type === 'profile_update')
      map[c.id] = {
        input_form: inputForm?.status || null,
        profile_update: profileUpdate?.status || null,
      }
    })
    return map
  }, [clients, formStatuses])

  // --- Action required: clients needing attention ---
  const actionRequiredClients = useMemo(() => {
    const now = new Date()
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    return [...clients]
      .filter(c => {
        const ds = dashboardStatuses[c.id]
        // Dashboard not started or in progress (not sent yet)
        if (!ds?.shareId) return true
        // Review date overdue or due within 14 days
        if (c.next_review_date) {
          const reviewDate = new Date(c.next_review_date)
          if (reviewDate <= in14Days) return true
        }
        // Details request awaiting
        const fs = clientFormStatusMap[c.id]
        if (fs?.input_form === 'awaiting' || fs?.input_form === 'not_opened') return true
        if (fs?.profile_update === 'awaiting' || fs?.profile_update === 'not_opened') return true
        return false
      })
      .sort((a, b) => {
        // Priority: overdue reviews first, then dashboard not started, then by name
        const aOverdue = a.next_review_date && new Date(a.next_review_date) < now ? 0 : 1
        const bOverdue = b.next_review_date && new Date(b.next_review_date) < now ? 0 : 1
        if (aOverdue !== bOverdue) return aOverdue - bOverdue
        const aDs = dashboardStatuses[a.id]
        const bDs = dashboardStatuses[b.id]
        const aDash = !aDs?.hasProperties ? 0 : !aDs?.shareId ? 1 : 2
        const bDash = !bDs?.hasProperties ? 0 : !bDs?.shareId ? 1 : 2
        if (aDash !== bDash) return aDash - bDash
        return a.name.localeCompare(b.name)
      })
  }, [clients, clientFormStatusMap, dashboardStatuses])

  // Overdue clients (review date in the past)
  const overdueClients = useMemo(() => {
    return clients.filter(c => {
      if (!c.next_review_date) return false
      return new Date(c.next_review_date) < today
    })
  }, [clients])

  // --- Calendar helpers ---
  const calendarMonths = useMemo(() => {
    const m1 = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const m2 = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
    return [m1, m2]
  }, [calendarMonth])

  // Map review dates to day keys for highlighting
  const reviewDateMap = useMemo(() => {
    const map: Record<string, Client[]> = {}
    clients.forEach(c => {
      if (!c.next_review_date) return
      const key = c.next_review_date.split('T')[0]
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    return map
  }, [clients])

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfWeek = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDayKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  const getDaysUntil = (dateStr: string) => {
    const d = new Date(dateStr)
    const diff = d.getTime() - today.getTime()
    return Math.ceil(diff / 86400000)
  }

  const getCountdownLabel = (dateStr: string) => {
    const days = getDaysUntil(dateStr)
    if (days < 0) return 'Overdue'
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    return `In ${days} days`
  }

  const getCountdownColor = (dateStr: string) => {
    const days = getDaysUntil(dateStr)
    if (days < 0) return 'bg-[#F5F5F6] text-[#414651] border border-[#E9EAEB]'
    if (days <= 7) return 'bg-[#F5F5F6] text-[#414651] border border-[#E9EAEB]'
    if (days <= 14) return 'bg-[#F5F5F6] text-[#535862] border border-[#E9EAEB]'
    return 'bg-[#F5F5F6] text-[#535862] border border-[#E9EAEB]'
  }

  const getCountdownBarColor = (dateStr: string) => {
    const days = getDaysUntil(dateStr)
    if (days < 0) return 'bg-[#414651]'
    if (days <= 7) return 'bg-[#535862]'
    if (days <= 14) return 'bg-[#535862]'
    return 'bg-[#A4A7AE]'
  }

  // Format relative time for activity feed
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const diff = today.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minutes ago`
    if (hours === 1) return '1 hour ago'
    if (hours < 24) return `${hours} hours ago`
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  // Get client by ID
  const getClient = (clientId: number) => {
    return clients.find(c => c.id === clientId)
  }

  // Event type display config
  const getActivityDescription = (entry: ActivityEntry) => {
    const client = getClient(entry.client_id)
    const name = client?.name || 'Unknown'
    const meta = entry.metadata || {}
    switch (entry.event_type) {
      case 'form_completed':
        return { text: `${name} completed ${meta.form_name === 'Profile Update' ? 'their details update' : 'their details form'}`, icon: <CheckCircle2 size={14} className="text-[#717680]" /> }
      case 'form_sent':
        return { text: `${name} — ${meta.form_name || 'form'} request sent`, icon: <Send size={14} className="text-[#717680]" /> }
      case 'portal_login':
        return { text: `${name} viewed their roadmap`, icon: <Eye size={14} className="text-gray-400" /> }
      case 'profile_updated':
        return { text: `${name} completed their profile update`, icon: <CheckCircle2 size={14} className="text-[#717680]" /> }
      case 'client_created':
        return { text: `${name} was added as a new client`, icon: <UserPlus size={14} className="text-[#717680]" /> }
      case 'scenario_created':
        return { text: `Scenario created for ${name}`, icon: <Target size={14} className="text-[#717680]" /> }
      case 'review_completed':
        return { text: `Review completed for ${name}`, icon: <CheckCircle2 size={14} className="text-[#717680]" /> }
      default: {
        const label = entry.event_type.replace(/_/g, ' ')
        return { text: `${label} for ${name}`, icon: <Clock size={14} className="text-gray-400" /> }
      }
    }
  }

  // --- Send form handler ---
  const handleSendForm = async () => {
    if (!sendFormClientId || !user) return
    setSendingForm(true)
    try {
      // Get company_id from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const { error } = await supabase
        .from('form_submissions')
        .insert({
          client_id: sendFormClientId,
          company_id: profileData?.company_id || null,
          sent_by: user.id,
          form_type: sendFormType,
          status: 'not_opened',
          sent_at: new Date().toISOString(),
        })

      if (error) throw error

      // Log activity
      await supabase.from('activity_log').insert({
        client_id: sendFormClientId,
        company_id: profileData?.company_id || null,
        actor_id: user.id,
        event_type: 'form_sent',
        metadata: {
          form_type: sendFormType,
          form_name: sendFormType === 'input_form' ? 'Client Details Form' : 'Client Details Update',
        },
      })

      const clientName = clients.find(c => c.id === sendFormClientId)?.name || 'client'
      toast.success(`Client details ${sendFormType === 'input_form' ? 'form' : 'update'} sent to ${clientName}`)

      // Refresh form statuses
      const { data: freshStatuses } = await supabase
        .from('form_submissions')
        .select('client_id, form_type, status, sent_at')
        .order('sent_at', { ascending: false })
      if (freshStatuses) setFormStatuses(freshStatuses as FormSubmissionStatus[])

      setSendFormOpen(false)
      setSendFormClientId(null)
    } catch {
      toast.error('Failed to send form')
    }
    setSendingForm(false)
  }

  // Form status badge renderer
  const openSendModal = (formType: 'input_form' | 'profile_update', clientId?: number) => {
    setSendFormType(formType)
    setSendFormClientId(clientId || null)
    setSendFormOpen(true)
  }

  const renderFormStatus = (status: string | null, formLabel: string, clientId?: number, formTypeKey?: string) => {
    const fType = (formTypeKey || 'input_form') as 'input_form' | 'profile_update'

    if (!status) {
      return (
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-[#717680]">{formLabel}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#414651] bg-[#F5F5F6] border border-[#E9EAEB] px-2.5 py-0.5 rounded-full">
            Not sent
          </span>
          <button
            className="text-xs font-semibold text-[#414651] bg-white border border-[#D5D7DA] hover:bg-[#F5F5F6] px-3 py-1 rounded-lg shadow-none transition-all duration-150"
            onClick={() => openSendModal(fType, clientId)}
          >
            Send
          </button>
        </div>
      )
    }
    if (status === 'completed') {
      return (
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-[#717680]">{formLabel}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#414651] bg-[#F5F5F6] border border-[#E9EAEB] px-2.5 py-0.5 rounded-full">
            <CheckCircle2 size={11} className="text-[#717680]" />
            Completed
          </span>
        </div>
      )
    }
    if (status === 'awaiting') {
      return (
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-[#717680]">{formLabel}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#414651] bg-[#F5F5F6] border border-[#E9EAEB] px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A4A7AE]" />
            Awaiting
          </span>
          <button
            className="text-xs font-medium text-[#717680] hover:text-[#414651] transition-colors duration-150"
            onClick={() => openSendModal(fType, clientId)}
          >
            Resend
          </button>
        </div>
      )
    }
    // not_opened
    return (
      <div className="flex items-center gap-2.5">
        <span className="text-sm text-[#717680]">{formLabel}</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#414651] bg-[#F5F5F6] border border-[#E9EAEB] px-2.5 py-0.5 rounded-full">
          Not sent
        </span>
        <button
          className="text-xs font-semibold text-[#414651] bg-white border border-[#D5D7DA] hover:bg-[#F5F5F6] px-3 py-1 rounded-lg shadow-none transition-all duration-150"
          onClick={() => openSendModal(fType, clientId)}
        >
          Send
        </button>
      </div>
    )
  }

  // Render a single calendar month
  const renderMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const daysInMonth = getDaysInMonth(monthDate)
    const firstDay = getFirstDayOfWeek(monthDate)
    const monthName = monthDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
    const todayKey = formatDayKey(today.getFullYear(), today.getMonth(), today.getDate())

    const cells: React.ReactNode[] = []

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-9" />)
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = formatDayKey(year, month, day)
      const dayClients = reviewDateMap[dayKey]
      const isToday = dayKey === todayKey
      const hasReviews = dayClients && dayClients.length > 0

      cells.push(
        <div key={day} className="relative flex items-center justify-center h-9">
          {hasReviews ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative cursor-default">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-semibold border border-[#E9EAEB]"
                    style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
                  >
                    {getInitials(dayClients[0].name)}
                  </div>
                  {dayClients.length > 1 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#535862] text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {dayClients.length}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  {dayClients.map(c => (
                    <div key={c.id}>{c.name}</div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div
              className={`h-8 w-8 flex items-center justify-center text-sm rounded-full transition-colors duration-100 ${
                isToday
                  ? 'bg-[#535862] text-white font-semibold'
                  : 'text-[#344054] hover:bg-[#F2F4F7]'
              }`}
            >
              {day}
            </div>
          )}
        </div>
      )
    }

    return (
      <div>
        <div className="text-sm font-semibold text-[#101828] mb-3">{monthName}</div>
        <div className="grid grid-cols-7 gap-y-1.5">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
            <div key={i} className="h-7 text-xs font-medium text-[#667085] text-center flex items-center justify-center">
              {d}
            </div>
          ))}
          {cells}
        </div>
      </div>
    )
  }

  // Reviews list for below calendar
  const upcomingReviewsList = useMemo(() => {
    return [...clients]
      .filter(c => c.next_review_date && new Date(c.next_review_date) >= today)
      .sort((a, b) => new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime())
      .slice(0, 6)
  }, [clients])

  // Period label for calendar header
  const calendarPeriodLabel = useMemo(() => {
    const m1 = calendarMonths[0]
    const m2 = calendarMonths[1]
    const fmt = (d: Date) => d.toLocaleDateString('en-AU', { month: 'short' })
    const yearLabel = m1.getFullYear() === m2.getFullYear() ? m2.getFullYear() : `${m1.getFullYear()}–${m2.getFullYear()}`
    return `${fmt(m1)} – ${fmt(m2)} ${yearLabel}`
  }, [calendarMonths])

  // Count reviews in next 90 days
  const reviewsIn90Days = useMemo(() => {
    const ninetyDays = new Date()
    ninetyDays.setDate(ninetyDays.getDate() + 90)
    return clients.filter(c => {
      if (!c.next_review_date) return false
      const d = new Date(c.next_review_date)
      return d >= today && d <= ninetyDays
    }).length
  }, [clients])

  return (
    <TooltipProvider>
      <div className="main-app flex h-screen w-full bg-white">
        <LeftRail />
        <div className="flex-1 overflow-hidden flex flex-col ml-16">
          <div className="flex-1 overflow-auto">
            <div className="flex-1 overflow-auto p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="page-title">Home</h2>
                  <p className="body-secondary mt-1">
                    {dateString} · {stats.reviewsDueThisMonth} review{stats.reviewsDueThisMonth !== 1 ? 's' : ''} due this month
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setSendFormType('input_form'); setSendFormClientId(null); setSendFormOpen(true) }}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#D0D5DD] rounded-lg text-sm font-medium text-[#344054] shadow-none hover:bg-[#F9FAFB] transition-all duration-150"
                  >
                    <FileText size={16} className="text-[#667085]" />
                    Send Client Details
                  </button>
                  <button
                    onClick={() => { setSendFormType('profile_update'); setSendFormClientId(null); setSendFormOpen(true) }}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#D0D5DD] rounded-lg text-sm font-medium text-[#344054] shadow-none hover:bg-[#F9FAFB] transition-all duration-150"
                  >
                    <Send size={16} className="text-[#667085]" />
                    Send Client Details Update
                  </button>
                  <button
                    onClick={() => navigate('/clients')}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-[#535862] text-white rounded-lg text-sm font-semibold hover:bg-[#414651] transition-all duration-150"
                  >
                    <UserPlus size={16} />
                    New Client
                  </button>
                </div>
              </div>

              {/* Overdue alert */}
              {overdueClients.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3.5 mb-8 bg-[#F5F5F6] border border-[#E9EAEB] rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-[#535862] flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={16} className="text-white" />
                  </div>
                  <p className="text-sm text-[#414651]">
                    {overdueClients.length} client{overdueClients.length > 1 ? 's have' : ' has'} an overdue review:{' '}
                    <span className="font-semibold">
                      {overdueClients.slice(0, 3).map(c => c.name).join(', ')}
                      {overdueClients.length > 3 ? ` +${overdueClients.length - 3} more` : ''}
                    </span>
                  </p>
                  <button
                    onClick={() => navigate('/clients')}
                    className="ml-auto text-sm font-semibold text-[#414651] hover:text-[#181D27] whitespace-nowrap transition-colors duration-150"
                  >
                    View all
                  </button>
                </div>
              )}

              {/* Stats cards */}
              <div className="grid grid-cols-4 gap-5 mb-8">
                <StatCard
                  label="Total Active Clients"
                  value={stats.activeClients}
                  subtitle="with a live roadmap"
                  info="Clients who have an active roadmap or scenario in progress"
                  badge={
                    stats.activeClients > 0
                      ? { label: `+1 this month`, variant: 'green' }
                      : undefined
                  }
                />
                <StatCard
                  label="Plans Used This Month"
                  value={`${activeSeats} / ${seatLimit}`}
                  info="Number of client plans used against your subscription limit this billing cycle"
                  progress={{ current: activeSeats, max: seatLimit }}
                />
                <StatCard
                  label="Awaiting Client Input"
                  value={stats.awaitingInput}
                  subtitle="clients with outstanding forms"
                  info="Clients who have been sent a form that hasn't been completed yet"
                  badge={
                    stats.awaitingInput > 0
                      ? { label: 'Needs attention', variant: 'amber' }
                      : undefined
                  }
                />
                <StatCard
                  label="Reviews Due This Month"
                  value={stats.reviewsDueThisMonth}
                  subtitle={`6-month check-ups in next 30 days`}
                  info="Clients whose 6-month review is coming up within the next 30 days"
                  badge={
                    stats.nextReviewStr
                      ? { label: `Next: ${stats.nextReviewStr}`, variant: 'gray' }
                      : undefined
                  }
                />
              </div>

              {/* Action Required */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <h3 className="section-heading">Action required</h3>
                    {clients.length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[#F5F5F6] text-[#414651] text-xs font-medium border border-[#E9EAEB]">
                        {actionRequiredClients.length}
                      </span>
                    )}
                  </div>
                </div>

                {clients.length === 0 ? (
                  <div className="bg-white border border-[#E9EAEB] rounded-xl p-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#F5F5F6] border border-[#E9EAEB] flex items-center justify-center mx-auto mb-4">
                      <div className="w-9 h-9 rounded-full bg-[#535862] flex items-center justify-center">
                        <UserPlus size={18} className="text-white" />
                      </div>
                    </div>
                    <p className="text-[#181D27] font-semibold text-base mb-1">Create your first client</p>
                    <p className="text-sm text-[#717680] mb-5">Add a client to get started with their investment roadmap</p>
                    <button
                      onClick={() => navigate('/clients')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#535862] text-white rounded-lg text-sm font-semibold hover:bg-[#414651] transition-all duration-150"
                    >
                      <UserPlus size={14} />
                      New Client
                    </button>
                  </div>
                ) : actionRequiredClients.length === 0 ? (
                  <div className="bg-white border border-[#E9EAEB] rounded-xl p-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#F5F5F6] border border-[#E9EAEB] flex items-center justify-center mx-auto mb-4">
                      <div className="w-9 h-9 rounded-full bg-[#535862] flex items-center justify-center">
                        <CheckCircle2 size={18} className="text-white" />
                      </div>
                    </div>
                    <p className="text-[#101828] font-semibold text-base mb-1">You're all caught up</p>
                    <p className="text-sm text-[#667085]">All clients are up to date. Nice work.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-[#EAECF0] rounded-xl overflow-hidden shadow-none">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#EAECF0] bg-[#F9FAFB] text-left">
                          <th className="table-header">Client</th>
                          <th className="table-header">Dashboard</th>
                          <th className="table-header">Review</th>
                          <th className="table-header">Client Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actionRequiredClients.map(client => {
                          const initials = getInitials(client.name)
                          const formStatus = clientFormStatusMap[client.id]
                          const ds = dashboardStatuses[client.id]

                          return (
                            <tr key={client.id} className="border-b border-[#F2F4F7] hover:bg-[#F9FAFB] transition-colors duration-100">
                              {/* Client */}
                              <td className="table-cell">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-[#E9EAEB]"
                                    style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
                                  >
                                    {initials}
                                  </div>
                                  {editingNameClientId === client.id ? (
                                    <input
                                      type="text"
                                      autoFocus
                                      defaultValue={client.name}
                                      className="text-sm font-medium text-[#101828] border border-[#D0D5DD] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#535862] focus:ring-offset-1 focus:border-transparent"
                                      onBlur={async (e) => {
                                        const val = e.target.value.trim()
                                        if (val && val !== client.name) {
                                          const ok = await updateClient(client.id, { name: val })
                                          if (ok) {
                                            toast.success('Client renamed')
                                          } else {
                                            toast.error('Failed to rename client')
                                          }
                                        }
                                        setEditingNameClientId(null)
                                      }}
                                      onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                          ;(e.target as HTMLInputElement).blur()
                                        } else if (e.key === 'Escape') {
                                          setEditingNameClientId(null)
                                        }
                                      }}
                                    />
                                  ) : (
                                    <button
                                      onClick={() => setEditingNameClientId(client.id)}
                                      className="text-sm font-medium text-[#101828] text-left hover:underline decoration-[#D0D5DD] underline-offset-2"
                                      title="Click to rename"
                                    >
                                      {client.name}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Dashboard */}
                              <td className="table-cell">
                                {ds?.shareId ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#414651] bg-[#F5F5F6] border border-[#E9EAEB] px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#717680]" />
                                    Sent to client
                                  </span>
                                ) : ds?.hasProperties ? (
                                  <button
                                    onClick={() => navigate('/clients')}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#414651] bg-[#F5F5F6] border border-[#E9EAEB] hover:bg-[#ECECED] px-2.5 py-1 rounded-full transition-colors duration-150"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#535862]" />
                                    In progress
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => navigate('/clients')}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#414651] bg-[#F5F5F6] border border-[#E9EAEB] hover:bg-[#ECECED] px-2.5 py-1 rounded-full transition-colors duration-150"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#A4A7AE]" />
                                    Not started
                                  </button>
                                )}
                              </td>

                              {/* Review */}
                              <td className="table-cell">
                                {editingReviewClientId === client.id ? (
                                  <input
                                    type="date"
                                    autoFocus
                                    defaultValue={client.next_review_date?.split('T')[0] || ''}
                                    className="text-sm border border-[#D0D5DD] rounded-lg px-2.5 py-1.5 shadow-none focus:outline-none focus:ring-2 focus:ring-[#535862] focus:ring-offset-1 focus:border-transparent"
                                    onBlur={async (e) => {
                                      const val = e.target.value
                                      if (val) {
                                        await updateClient(client.id, { next_review_date: val })
                                      }
                                      setEditingReviewClientId(null)
                                    }}
                                    onKeyDown={async (e) => {
                                      if (e.key === 'Enter') {
                                        const val = (e.target as HTMLInputElement).value
                                        if (val) {
                                          await updateClient(client.id, { next_review_date: val })
                                        }
                                        setEditingReviewClientId(null)
                                      } else if (e.key === 'Escape') {
                                        setEditingReviewClientId(null)
                                      }
                                    }}
                                  />
                                ) : client.next_review_date ? (
                                  <button
                                    onClick={() => setEditingReviewClientId(client.id)}
                                    className="text-left group"
                                  >
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-sm font-medium text-[#101828] group-hover:text-[#181D27] transition-colors duration-150">
                                        {new Date(client.next_review_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <div className={`h-1.5 w-16 rounded-full ${getCountdownBarColor(client.next_review_date)}`} />
                                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getCountdownColor(client.next_review_date)}`}>
                                          {getCountdownLabel(client.next_review_date)}
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingReviewClientId(client.id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#414651] bg-[#F5F5F6] border border-[#E9EAEB] hover:bg-[#ECECED] rounded-lg transition-colors duration-150"
                                  >
                                    <CalendarCheck size={13} className="text-[#717680]" />
                                    Set catchup
                                  </button>
                                )}
                              </td>

                              {/* Details Request */}
                              <td className="table-cell">
                                {renderFormStatus(
                                  formStatus?.input_form === 'completed' ? (formStatus?.profile_update || null) : (formStatus?.input_form || null),
                                  formStatus?.input_form === 'completed' ? 'Client details update' : 'Client details update',
                                  client.id,
                                  formStatus?.input_form === 'completed' ? 'profile_update' : 'input_form'
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <div className="px-5 py-3.5 border-t border-[#EAECF0] bg-white flex items-center justify-end gap-4">
                      <span className="text-sm text-[#667085]">Showing clients that need attention</span>
                      <button
                        onClick={() => navigate('/clients')}
                        className="text-sm text-[#535862] hover:text-[#414651] font-semibold transition-colors duration-150"
                      >
                        View all clients &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom section: Calendar + Activity */}
              <div className="grid grid-cols-3 gap-6">
                {/* Left: Upcoming Reviews Calendar */}
                <div className="col-span-2">
                  <div className="bg-white border border-[#EAECF0] rounded-xl p-6 shadow-none">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <h3 className="section-heading">Upcoming reviews</h3>
                        <span className="inline-flex items-center text-xs font-medium text-[#414651] bg-[#F5F5F6] border border-[#E9EAEB] px-2.5 py-0.5 rounded-full">
                          {reviewsIn90Days} in next 90 days
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#667085]">{calendarPeriodLabel}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const prev = new Date(calendarMonth)
                              prev.setMonth(prev.getMonth() - 1)
                              setCalendarMonth(prev)
                            }}
                            className="p-1.5 text-[#667085] hover:text-[#344054] hover:bg-[#F2F4F7] rounded-lg transition-all duration-150"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            onClick={() => {
                              const next = new Date(calendarMonth)
                              next.setMonth(next.getMonth() + 1)
                              setCalendarMonth(next)
                            }}
                            className="p-1.5 text-[#667085] hover:text-[#344054] hover:bg-[#F2F4F7] rounded-lg transition-all duration-150"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Dual month calendars */}
                    <div className="grid grid-cols-2 gap-10">
                      {calendarMonths.map((m, i) => (
                        <div key={i}>{renderMonth(m)}</div>
                      ))}
                    </div>

                    {/* Review summary list below calendar */}
                    <div className="mt-6 pt-5 border-t border-[#F2F4F7]">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="text-sm text-[#667085] font-medium">Reviews:</span>
                        {upcomingReviewsList.map(client => {
                          const initials = getInitials(client.name)
                          const countdownLabel = getCountdownLabel(client.next_review_date!)
                          const days = getDaysUntil(client.next_review_date!)
                          const badgeColor = days <= 7 ? 'text-[#535862]' : days <= 14 ? 'text-[#717680]' : 'text-[#A4A7AE]'

                          return (
                            <div key={client.id} className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold border border-[#E9EAEB]"
                                style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
                              >
                                {initials}
                              </div>
                              <span className="text-sm text-[#344054] font-medium">{client.name}</span>
                              <span className={`text-xs font-medium ${badgeColor}`}>{countdownLabel}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Activity Feed */}
                <div>
                  <div className="bg-white border border-[#EAECF0] rounded-xl p-6 shadow-none">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="section-heading">Recent activity</h3>
                      <span className="text-sm text-[#667085]">Last 7 days</span>
                    </div>
                    {activityLoading ? (
                      <div className="text-sm text-[#667085] text-center py-8">Loading...</div>
                    ) : activityLog.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-full bg-[#F5F5F6] border border-[#E9EAEB] flex items-center justify-center mx-auto mb-4">
                          <div className="w-9 h-9 rounded-full bg-[#535862] flex items-center justify-center">
                            <Clock size={18} className="text-white" />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-[#101828]">No recent activity</p>
                        <p className="text-sm text-[#667085] mt-1">Activity will appear here as you and your clients interact</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#F2F4F7]">
                        {activityLog.slice(0, 8).map(entry => {
                          const client = getClient(entry.client_id)
                          const initials = client ? getInitials(client.name) : '??'
                          const activity = getActivityDescription(entry)

                          return (
                            <div key={entry.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5 border border-[#E9EAEB]"
                                style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-[#344054] leading-snug">
                                  {activity.text}
                                </p>
                                <p className="text-xs text-[#667085] mt-1">
                                  {formatRelativeTime(entry.created_at)}
                                </p>
                              </div>
                              <div className="flex-shrink-0 mt-1">
                                {activity.icon}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      {/* Send Form Modal */}
      <Dialog open={sendFormOpen} onOpenChange={setSendFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#101828]">
              {sendFormType === 'input_form' ? 'Send Client Details Form' : 'Send Client Details Update'}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#667085] mt-1">
              {sendFormType === 'input_form'
                ? 'Request financial details from a new client to build their investment roadmap.'
                : 'Request updated financial details during a client\'s review cycle.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-3">
            <div>
              <label className="text-sm font-medium text-[#344054] mb-1.5 block">Select client</label>
              <select
                value={sendFormClientId || ''}
                onChange={(e) => setSendFormClientId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3.5 py-2.5 border border-[#D0D5DD] rounded-lg text-sm text-[#101828] shadow-none focus:outline-none focus:ring-2 focus:ring-[#535862] focus:ring-offset-1 focus:border-transparent"
              >
                <option value="">Choose a client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setSendFormOpen(false)}
                className="px-4 py-2.5 text-sm font-semibold text-[#344054] bg-white border border-[#D0D5DD] rounded-lg shadow-none hover:bg-[#F9FAFB] transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleSendForm}
                disabled={!sendFormClientId || sendingForm}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-[#535862] rounded-lg hover:bg-[#414651] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2"
              >
                <Send size={14} />
                {sendingForm ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
