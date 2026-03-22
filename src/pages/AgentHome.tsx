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
  ArrowRight,
  FileText,
  Building2,
  CheckCircle2,
  Eye,
  Info,
  Filter,
  ArrowUpDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LeftRail } from '@/components/LeftRail'
import { HomeDrawer } from '@/components/HomeDrawer'
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

// Avatar colour palette for client initials
const AVATAR_COLORS = [
  '#2563EB', // blue
  '#D97706', // amber
  '#059669', // emerald
  '#DC2626', // red
  '#7C3AED', // violet
  '#0891B2', // cyan
  '#EA580C', // orange
  '#4F46E5', // indigo
]

const getAvatarColor = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export const AgentHome = () => {
  const navigate = useNavigate()
  const { clients, activeSeats, seatLimit } = useClient()
  const { user, role } = useAuth()
  const { branding } = useBranding()
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [formStatuses, setFormStatuses] = useState<FormSubmissionStatus[]>([])
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [drawerOpen, setDrawerOpen] = useState(true)

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

  // --- Meeting prep: clients sorted by next review date ---
  const meetingPrepClients = useMemo(() => {
    return [...clients]
      .filter(c => c.next_review_date)
      .sort((a, b) => {
        const da = new Date(a.next_review_date!).getTime()
        const db = new Date(b.next_review_date!).getTime()
        return da - db
      })
  }, [clients])

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
    if (days < 0) return 'bg-red-50 text-red-600 border-red-200'
    if (days <= 7) return 'bg-orange-50 text-orange-600 border-orange-200'
    if (days <= 14) return 'bg-amber-50 text-amber-600 border-amber-200'
    return 'bg-gray-100 text-gray-500 border-gray-200'
  }

  const getCountdownBarColor = (dateStr: string) => {
    const days = getDaysUntil(dateStr)
    if (days < 0) return 'bg-red-500'
    if (days <= 7) return 'bg-orange-400'
    if (days <= 14) return 'bg-amber-400'
    return 'bg-gray-300'
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
        return { text: `${name} completed ${meta.form_name === 'Profile Update' ? 'their profile update' : 'his input form'}`, icon: <CheckCircle2 size={14} className="text-green-500" /> }
      case 'form_sent':
        return { text: `${name} — ${meta.form_name || 'form'} request sent`, icon: <Send size={14} className="text-blue-500" /> }
      case 'portal_login':
        return { text: `${name} viewed their roadmap`, icon: <Eye size={14} className="text-gray-400" /> }
      case 'profile_updated':
        return { text: `${name} completed their profile update`, icon: <CheckCircle2 size={14} className="text-green-500" /> }
      case 'client_created':
        return { text: `${name} was added as a new client`, icon: <UserPlus size={14} className="text-blue-500" /> }
      case 'scenario_created':
        return { text: `Scenario created for ${name}`, icon: <Target size={14} className="text-blue-500" /> }
      case 'review_completed':
        return { text: `Review completed for ${name}`, icon: <CheckCircle2 size={14} className="text-green-500" /> }
      default: {
        const label = entry.event_type.replace(/_/g, ' ')
        return { text: `${label} for ${name}`, icon: <Clock size={14} className="text-gray-400" /> }
      }
    }
  }

  // Readiness: how many of 2 forms (input_form + profile_update) are completed
  const getReadiness = (clientId: number) => {
    const statuses = clientFormStatusMap[clientId]
    if (!statuses) return { done: 0, total: 2 }
    let done = 0
    if (statuses.input_form === 'completed') done++
    if (statuses.profile_update === 'completed') done++
    return { done, total: 2 }
  }

  // Form status badge renderer
  const renderFormStatus = (status: string | null, formLabel: string) => {
    if (!status) {
      return (
        <div className="flex items-center gap-2">
          <span className="meta">{formLabel}</span>
          <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">Not sent</span>
          <button
            className="text-[11px] font-medium text-white bg-[#2563EB] hover:bg-[#1d4ed8] px-2.5 py-0.5 rounded transition-colors"
            onClick={() => navigate('/forms')}
          >
            Send
          </button>
        </div>
      )
    }
    if (status === 'completed') {
      return (
        <div className="flex items-center gap-2">
          <span className="meta">{formLabel}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
            <CheckCircle2 size={10} />
            Completed
          </span>
        </div>
      )
    }
    if (status === 'awaiting') {
      return (
        <div className="flex items-center gap-2">
          <span className="meta">{formLabel}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Awaiting
          </span>
          <button
            className="text-[11px] text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => navigate('/forms')}
          >
            Resend
          </button>
        </div>
      )
    }
    // not_opened
    return (
      <div className="flex items-center gap-2">
        <span className="meta">{formLabel}</span>
        <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">Not sent</span>
        <button
          className="text-[11px] font-medium text-white bg-[#2563EB] hover:bg-[#1d4ed8] px-2.5 py-0.5 rounded transition-colors"
          onClick={() => navigate('/forms')}
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
      cells.push(<div key={`empty-${i}`} className="h-8" />)
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = formatDayKey(year, month, day)
      const dayClients = reviewDateMap[dayKey]
      const isToday = dayKey === todayKey
      const hasReviews = dayClients && dayClients.length > 0

      cells.push(
        <div key={day} className="relative flex items-center justify-center">
          {hasReviews ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white cursor-default"
                    style={{ backgroundColor: getAvatarColor(dayClients[0].name) }}
                  >
                    {getInitials(dayClients[0].name)}
                  </div>
                  {dayClients.length > 1 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gray-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
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
              className={`h-7 w-7 flex items-center justify-center text-xs rounded-full ${
                isToday
                  ? 'bg-[#2563EB] text-white font-semibold'
                  : 'text-[#374151]'
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
        <div className="section-heading mb-3">{monthName}</div>
        <div className="grid grid-cols-7 gap-y-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
            <div key={i} className="h-6 text-[10px] font-medium text-[#9ca3af] text-center">
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
      <div className="main-app flex h-screen w-full bg-[#f9fafb]">
        <LeftRail />
        <HomeDrawer isOpen={drawerOpen} onToggle={() => setDrawerOpen(o => !o)} />
        <div className={`flex-1 overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
          drawerOpen ? 'ml-[calc(4rem+14rem)]' : 'ml-16'
        }`}>
          <div className="flex-1 overflow-auto">
            <div className="flex-1 overflow-auto p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="page-title">Home</h2>
                  <p className="body-secondary mt-0.5">
                    {dateString} · {stats.reviewsDueThisMonth} review{stats.reviewsDueThisMonth !== 1 ? 's' : ''} due this month
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/forms')}
                    className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-[#374151] hover:bg-gray-50 transition-colors"
                  >
                    <FileText size={14} className="text-[#6b7280]" />
                    Send Input Request
                  </button>
                  <button
                    onClick={() => navigate('/forms')}
                    className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-[#374151] hover:bg-gray-50 transition-colors"
                  >
                    <Send size={14} className="text-[#6b7280]" />
                    Send Profile Update
                  </button>
                  <button
                    onClick={() => navigate('/clients')}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[#2563EB] text-white rounded-lg text-sm hover:bg-[#1d4ed8] transition-colors"
                  >
                    <UserPlus size={14} />
                    New Client
                  </button>
                </div>
              </div>

              {/* Overdue alert */}
              {overdueClients.length > 0 && (
                <div className="flex items-center gap-3 p-3 mb-6 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    {overdueClients.length} client{overdueClients.length > 1 ? 's have' : ' has'} an overdue review:{' '}
                    <span className="font-medium">
                      {overdueClients.slice(0, 3).map(c => c.name).join(', ')}
                      {overdueClients.length > 3 ? ` +${overdueClients.length - 3} more` : ''}
                    </span>
                  </p>
                  <button
                    onClick={() => navigate('/clients')}
                    className="ml-auto text-sm font-medium text-red-700 hover:text-red-800 whitespace-nowrap"
                  >
                    View all
                  </button>
                </div>
              )}

              {/* Stats cards */}
              <div className="grid grid-cols-4 gap-4 mb-8">
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

              {/* Meeting Prep Table */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="section-heading">Meeting prep</h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-[#2563EB] text-xs font-medium">
                      {meetingPrepClients.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-[#6b7280] hover:bg-gray-50 transition-colors">
                      <Filter size={12} />
                      Filter
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-[#6b7280] hover:bg-gray-50 transition-colors">
                      <ArrowUpDown size={12} />
                      Sort
                    </button>
                  </div>
                </div>

                {meetingPrepClients.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                    <CalendarIcon size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="body-secondary">No upcoming reviews scheduled</p>
                    <p className="meta mt-1">Set review dates on client profiles to see them here</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 text-left">
                          <th className="table-header">Client</th>
                          <th className="table-header">Review Due</th>
                          <th className="table-header">Input Form</th>
                          <th className="table-header">Profile Update</th>
                          <th className="table-header text-right">Readiness</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meetingPrepClients.map(client => {
                          const initials = getInitials(client.name)
                          const avatarColor = getAvatarColor(client.name)
                          const reviewDate = new Date(client.next_review_date!).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                          const countdownLabel = getCountdownLabel(client.next_review_date!)
                          const countdownColor = getCountdownBarColor(client.next_review_date!)
                          const formStatus = clientFormStatusMap[client.id]
                          const readiness = getReadiness(client.id)

                          return (
                            <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50/40 transition-colors">
                              {/* Client */}
                              <td className="table-cell">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                                    style={{ backgroundColor: avatarColor }}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <div className="body-dark font-medium">{client.name}</div>
                                    <button
                                      onClick={() => {
                                        navigate('/clients')
                                      }}
                                      className="text-[11px] text-[#2563EB] hover:underline"
                                    >
                                      Open workspace →
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* Review Due */}
                              <td className="table-cell">
                                <div className="flex flex-col gap-1">
                                  <span className="body-dark font-medium">{reviewDate}</span>
                                  <div className="flex items-center gap-2">
                                    <div className={`h-1 w-16 rounded-full ${countdownColor}`} />
                                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${getCountdownColor(client.next_review_date!)}`}>
                                      {countdownLabel}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Input Form */}
                              <td className="table-cell">
                                {renderFormStatus(formStatus?.input_form, 'Input form')}
                              </td>

                              {/* Profile Update */}
                              <td className="table-cell">
                                {renderFormStatus(formStatus?.profile_update, 'Profile update')}
                              </td>

                              {/* Readiness */}
                              <td className="table-cell text-right">
                                {readiness.done === readiness.total ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                                    <CheckCircle2 size={12} />
                                    Ready
                                  </span>
                                ) : (
                                  <div className="inline-flex flex-col items-end gap-1">
                                    <span className="meta">{readiness.done} of {readiness.total} done</span>
                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-[#2563EB] rounded-full transition-all"
                                        style={{ width: `${(readiness.done / readiness.total) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <div className="px-5 py-3 border-t border-gray-100 text-right">
                      <span className="meta">Sorted by review date · soonest first</span>
                      <button
                        onClick={() => navigate('/clients')}
                        className="ml-4 text-xs text-[#2563EB] hover:underline font-medium"
                      >
                        View all clients →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom section: Calendar + Activity */}
              <div className="grid grid-cols-3 gap-6">
                {/* Left: Upcoming Reviews Calendar */}
                <div className="col-span-2">
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="section-heading">Upcoming reviews</h3>
                        <span className="text-xs text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                          {reviewsIn90Days} in next 90 days
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="meta">{calendarPeriodLabel}</span>
                        <button
                          onClick={() => {
                            const prev = new Date(calendarMonth)
                            prev.setMonth(prev.getMonth() - 1)
                            setCalendarMonth(prev)
                          }}
                          className="p-1 text-[#6b7280] hover:text-[#374151] hover:bg-gray-100 rounded transition-colors"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={() => {
                            const next = new Date(calendarMonth)
                            next.setMonth(next.getMonth() + 1)
                            setCalendarMonth(next)
                          }}
                          className="p-1 text-[#6b7280] hover:text-[#374151] hover:bg-gray-100 rounded transition-colors"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Dual month calendars */}
                    <div className="grid grid-cols-2 gap-8">
                      {calendarMonths.map((m, i) => (
                        <div key={i}>{renderMonth(m)}</div>
                      ))}
                    </div>

                    {/* Review summary list below calendar */}
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="meta">Reviews:</span>
                        {upcomingReviewsList.map(client => {
                          const avatarColor = getAvatarColor(client.name)
                          const initials = getInitials(client.name)
                          const countdownLabel = getCountdownLabel(client.next_review_date!)
                          const days = getDaysUntil(client.next_review_date!)
                          const badgeColor = days <= 7 ? 'text-orange-600' : days <= 14 ? 'text-amber-600' : 'text-gray-500'

                          return (
                            <div key={client.id} className="flex items-center gap-1.5">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium"
                                style={{ backgroundColor: avatarColor }}
                              >
                                {initials}
                              </div>
                              <span className="text-xs text-[#374151] font-medium">{client.name}</span>
                              <span className={`text-[10px] font-medium ${badgeColor}`}>{countdownLabel}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Activity Feed */}
                <div>
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="section-heading">Recent activity</h3>
                      <span className="meta">Last 7 days</span>
                    </div>
                    {activityLoading ? (
                      <div className="body-secondary text-center py-6">Loading...</div>
                    ) : activityLog.length === 0 ? (
                      <div className="text-center py-6">
                        <Clock size={24} className="text-gray-300 mx-auto mb-2" />
                        <p className="body-secondary">No recent activity</p>
                        <p className="meta mt-0.5">Activity will appear here as you and your clients interact</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activityLog.slice(0, 8).map(entry => {
                          const client = getClient(entry.client_id)
                          const initials = client ? getInitials(client.name) : '??'
                          const avatarColor = client ? getAvatarColor(client.name) : '#6b7280'
                          const activity = getActivityDescription(entry)

                          return (
                            <div key={entry.id} className="flex items-start gap-3">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0 mt-0.5"
                                style={{ backgroundColor: avatarColor }}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-[#374151] leading-snug">
                                  {activity.text}
                                </p>
                                <p className="meta mt-0.5">
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
    </TooltipProvider>
  )
}
