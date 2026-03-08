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
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LeftRail } from '@/components/LeftRail'
import { useClient, Client } from '@/contexts/ClientContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBranding } from '@/contexts/BrandingContext'
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

export const AgentHome = () => {
  const navigate = useNavigate()
  const { clients } = useClient()
  const { user } = useAuth()
  const { branding } = useBranding()
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
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

  // --- Stats ---
  const stats = useMemo(() => {
    const total = clients.length
    const onboarding = clients.filter(c => c.stage === 'onboarding').length
    const finalised = clients.filter(c => c.roadmap_status === 'finalised').length

    // Upcoming reviews: clients with review date within next 30 days
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const upcomingReviews = clients.filter(c => {
      if (!c.next_review_date) return false
      const d = new Date(c.next_review_date)
      return d <= thirtyDaysFromNow
    }).length

    return { total, onboarding, finalised, upcomingReviews }
  }, [clients])

  // --- Review cards: clients sorted by next review date ---
  const reviewClients = useMemo(() => {
    return [...clients]
      .filter(c => c.next_review_date)
      .sort((a, b) => {
        const da = new Date(a.next_review_date!).getTime()
        const db = new Date(b.next_review_date!).getTime()
        return da - db
      })
      .slice(0, 8)
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
      const key = c.next_review_date.split('T')[0] // YYYY-MM-DD
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

  const getReviewDaysUntil = (dateStr: string) => {
    const d = new Date(dateStr)
    const diff = d.getTime() - today.getTime()
    const days = Math.ceil(diff / 86400000)
    if (days < 0) return 'Overdue'
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days <= 7) return `${days} days`
    if (days <= 30) return `${Math.ceil(days / 7)} weeks`
    return `${Math.ceil(days / 30)} months`
  }

  // Format relative time for activity feed
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const diff = today.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  // Get client name by ID
  const getClientName = (clientId: number) => {
    return clients.find(c => c.id === clientId)?.name || 'Unknown'
  }

  // Event type display config
  const eventConfig: Record<string, { label: string; color: string }> = {
    form_sent: { label: 'Form sent', color: 'text-blue-600' },
    form_completed: { label: 'Form completed', color: 'text-green-600' },
    profile_updated: { label: 'Profile updated', color: 'text-purple-600' },
    portal_login: { label: 'Portal login', color: 'text-teal-600' },
    scenario_created: { label: 'Scenario created', color: 'text-blue-600' },
    client_created: { label: 'Client added', color: 'text-gray-600' },
    review_completed: { label: 'Review completed', color: 'text-green-600' },
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
      const reviewClients = reviewDateMap[dayKey]
      const isToday = dayKey === todayKey
      const hasReviews = reviewClients && reviewClients.length > 0

      cells.push(
        <div key={day} className="relative">
          {hasReviews ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`h-8 w-8 flex items-center justify-center text-xs rounded-full mx-auto cursor-default ${
                    isToday
                      ? 'bg-[#3b82f6] text-white font-semibold'
                      : 'text-[#374151]'
                  }`}
                >
                  {day}
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {reviewClients.slice(0, 3).map((_, i) => (
                      <span key={i} className="w-1 h-1 rounded-full bg-[#3b82f6]" />
                    ))}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  {reviewClients.map(c => (
                    <div key={c.id}>{c.name}</div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div
              className={`h-8 w-8 flex items-center justify-center text-xs rounded-full mx-auto ${
                isToday
                  ? 'bg-[#3b82f6] text-white font-semibold'
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
        <div className="text-sm font-medium text-[#111827] mb-3">{monthName}</div>
        <div className="grid grid-cols-7 gap-y-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="h-6 text-[10px] font-medium text-[#9ca3af] text-center">
              {d}
            </div>
          ))}
          {cells}
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="main-app flex h-screen w-full bg-[#f9fafb]">
        <LeftRail />
        <div className="flex-1 ml-16 overflow-hidden flex flex-col">
          <div className="bg-white flex-1 overflow-auto">
            <div className="flex-1 overflow-auto p-8 bg-white">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-lg font-medium text-[#111827]">Good morning, {firstName}</h2>
                <p className="text-sm text-[#6b7280] mt-0.5">{dateString}</p>
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
                {[
                  { label: 'Total Clients', value: stats.total, icon: Users, color: 'text-[#3b82f6]', bg: 'bg-blue-50' },
                  { label: 'Upcoming Reviews', value: stats.upcomingReviews, icon: CalendarCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Onboarding', value: stats.onboarding, icon: UserPlus, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Plans Finalised', value: stats.finalised, icon: Target, color: 'text-green-600', bg: 'bg-green-50' },
                ].map(card => {
                  const Icon = card.icon
                  return (
                    <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[#6b7280]">{card.label}</span>
                        <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                          <Icon size={16} className={card.color} />
                        </div>
                      </div>
                      <div className="text-2xl font-semibold text-[#111827]">{card.value}</div>
                    </div>
                  )
                })}
              </div>

              {/* Main content: Review cards + Calendar/Activity */}
              <div className="grid grid-cols-3 gap-6">
                {/* Left column: Upcoming Reviews */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[#111827]">Upcoming Reviews</h3>
                    <button
                      onClick={() => navigate('/clients')}
                      className="text-xs text-[#3b82f6] hover:text-[#2563eb] font-medium flex items-center gap-1"
                    >
                      View all clients
                      <ArrowRight size={12} />
                    </button>
                  </div>

                  {reviewClients.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                      <CalendarIcon size={32} className="text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-[#6b7280]">No upcoming reviews scheduled</p>
                      <p className="text-xs text-[#9ca3af] mt-1">
                        Set review dates on client profiles to see them here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reviewClients.map(client => {
                        const initials = client.name
                          .split(' ')
                          .map(w => w[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                        const countdown = getReviewDaysUntil(client.next_review_date!)
                        const isOverdue = countdown === 'Overdue'
                        const isUrgent = !isOverdue && (countdown === 'Today' || countdown === 'Tomorrow')
                        const reviewDate = new Date(client.next_review_date!).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })

                        return (
                          <div
                            key={client.id}
                            className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#3b82f6] bg-opacity-60 flex items-center justify-center text-white text-sm flex-shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-[#111827]">{client.name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-[#6b7280]">{reviewDate}</span>
                                  <span
                                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                      isOverdue
                                        ? 'bg-red-50 text-red-600'
                                        : isUrgent
                                        ? 'bg-amber-50 text-amber-600'
                                        : 'bg-gray-100 text-[#6b7280]'
                                    }`}
                                  >
                                    {countdown}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => navigate('/clients')}
                                    className="p-1.5 text-[#6b7280] hover:text-[#3b82f6] hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <Send size={14} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Send review form</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => navigate('/clients')}
                                    className="p-1.5 text-[#6b7280] hover:text-[#3b82f6] hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <Target size={14} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View plan</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Right column: Calendar + Activity Feed */}
                <div className="space-y-6">
                  {/* Review Calendar */}
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-[#111827]">Review Calendar</h3>
                      <div className="flex items-center gap-1">
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
                    <div className="space-y-5">
                      {calendarMonths.map((m, i) => (
                        <div key={i}>{renderMonth(m)}</div>
                      ))}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#6b7280]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                        Client review
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#6b7280]">
                        <span className="w-5 h-5 rounded-full bg-[#3b82f6] inline-flex items-center justify-center text-white text-[9px]">
                          {today.getDate()}
                        </span>
                        Today
                      </div>
                    </div>
                  </div>

                  {/* Activity Feed */}
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <h3 className="text-sm font-medium text-[#111827] mb-4">Recent Activity</h3>
                    {activityLoading ? (
                      <div className="text-sm text-[#6b7280] text-center py-6">Loading...</div>
                    ) : activityLog.length === 0 ? (
                      <div className="text-center py-6">
                        <Clock size={24} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-[#6b7280]">No recent activity</p>
                        <p className="text-xs text-[#9ca3af] mt-0.5">Activity will appear here as you and your clients interact</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activityLog.map(entry => {
                          const config = eventConfig[entry.event_type] || {
                            label: entry.event_type.replace(/_/g, ' '),
                            color: 'text-gray-600',
                          }
                          return (
                            <div key={entry.id} className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-[#374151]">
                                  <span className={`font-medium ${config.color}`}>{config.label}</span>
                                  {' for '}
                                  <span className="font-medium text-[#111827]">
                                    {getClientName(entry.client_id)}
                                  </span>
                                </div>
                                <div className="text-xs text-[#9ca3af] mt-0.5">
                                  {formatRelativeTime(entry.created_at)}
                                </div>
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
