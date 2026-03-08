import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBranding } from '@/contexts/BrandingContext'
import { usePortalClient } from '@/hooks/usePortalClient'
import { supabase } from '@/integrations/supabase/client'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'

interface Property {
  id: number
  current_value: number | null
  loan_balance: number | null
  rental_income_weekly: number | null
}

export const PortalHome = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { branding } = useBranding()
  const { client, loading } = usePortalClient()
  const [properties, setProperties] = useState<Property[]>([])

  const firstName = client?.name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateString = today.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Fetch client's properties for portfolio stats
  useEffect(() => {
    const fetchProperties = async () => {
      if (!client) return
      try {
        const { data, error } = await supabase
          .from('client_properties')
          .select('id, current_value, loan_balance, rental_income_weekly')
          .eq('client_id', client.id)

        if (!error && data) {
          setProperties(data as Property[])
        }
      } catch {
        // Fetch failed silently
      }
    }

    fetchProperties()
  }, [client?.id])

  // Portfolio stats from real property data
  const portfolioStats = useMemo(() => {
    if (properties.length === 0) {
      return { totalValue: null, totalEquity: null, weeklyRent: null }
    }
    const totalValue = properties.reduce((sum, p) => sum + (p.current_value || 0), 0)
    const totalLoans = properties.reduce((sum, p) => sum + (p.loan_balance || 0), 0)
    const weeklyRent = properties.reduce((sum, p) => sum + (p.rental_income_weekly || 0), 0)
    return {
      totalValue: totalValue > 0 ? totalValue : null,
      totalEquity: totalValue > 0 ? totalValue - totalLoans : null,
      weeklyRent: weeklyRent > 0 ? weeklyRent : null,
    }
  }, [properties])

  const formatCurrency = (val: number | null) => {
    if (val == null) return '--'
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(val)
  }

  // Review date info
  const reviewInfo = useMemo(() => {
    if (!client?.next_review_date) {
      return { text: 'Not scheduled', countdown: null, isOverdue: false }
    }
    const reviewDate = new Date(client.next_review_date)
    const diff = reviewDate.getTime() - today.getTime()
    const days = Math.ceil(diff / 86400000)
    const formatted = reviewDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

    if (days < 0) return { text: formatted, countdown: 'Overdue', isOverdue: true }
    if (days === 0) return { text: formatted, countdown: 'Today', isOverdue: false }
    if (days === 1) return { text: formatted, countdown: 'Tomorrow', isOverdue: false }
    if (days <= 30) return { text: formatted, countdown: `${days} days`, isOverdue: false }
    return { text: formatted, countdown: `${Math.ceil(days / 7)} weeks`, isOverdue: false }
  }, [client?.next_review_date])

  // Checklist items based on real data
  const checklist = useMemo(() => {
    if (!client) return []

    const items = []

    // Profile completeness
    const hasFinancials = !!(client.annual_income || client.available_savings || client.borrowing_capacity)
    items.push({
      label: 'Complete your profile',
      sub: hasFinancials ? 'Financial details added' : 'Add your income, savings, and borrowing capacity',
      done: hasFinancials,
      action: () => navigate('/portal/profile'),
    })

    // Preferences
    const hasPreferences = !!(client.risk_tolerance || client.primary_goal)
    items.push({
      label: 'Set investment preferences',
      sub: hasPreferences ? 'Preferences set' : 'Tell your agent about your investment goals',
      done: hasPreferences,
      action: () => navigate('/portal/profile'),
    })

    // Portfolio
    items.push({
      label: 'Add your properties',
      sub: properties.length > 0 ? `${properties.length} properties tracked` : 'Track your existing properties',
      done: properties.length > 0,
      action: () => navigate('/portal/portfolio'),
    })

    // Property plan (check if client has a roadmap)
    const hasPlan = client.roadmap_status === 'finalised' || client.roadmap_status === 'in_review'
    items.push({
      label: 'Review your property plan',
      sub: hasPlan ? 'Plan ready to view' : 'Your agent is preparing your plan',
      done: hasPlan,
      action: () => navigate('/portal/property-plan'),
    })

    return items
  }, [client, properties.length])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {firstName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{dateString}</p>
      </div>

      {/* Review countdown banner */}
      {client?.next_review_date ? (
        <div
          className="flex items-center justify-between rounded-xl p-4 mb-6"
          style={{ backgroundColor: `${branding.primaryColor}10`, border: `1px solid ${branding.primaryColor}25` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${branding.primaryColor}20` }}
            >
              <span className="text-lg">📋</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Next review: {reviewInfo.text}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {reviewInfo.isOverdue
                  ? 'Your review is overdue. Your agent will be in touch.'
                  : `${reviewInfo.countdown} until your next portfolio review`
                }
              </p>
            </div>
          </div>
          {reviewInfo.countdown && (
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                reviewInfo.isOverdue
                  ? 'bg-red-50 text-red-600'
                  : 'bg-white text-gray-700'
              }`}
            >
              {reviewInfo.countdown}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${branding.primaryColor}15` }}
            >
              <span className="text-lg">📋</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Welcome to your portal</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Your buyers agent will set up your review schedule
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'PORTFOLIO VALUE',
            value: formatCurrency(portfolioStats.totalValue),
            sub: properties.length > 0 ? `${properties.length} properties` : 'No properties yet',
          },
          {
            label: 'TOTAL EQUITY',
            value: formatCurrency(portfolioStats.totalEquity),
            sub: 'across your portfolio',
          },
          {
            label: 'WEEKLY RENTAL INCOME',
            value: formatCurrency(portfolioStats.weeklyRent),
            sub: 'from investments',
          },
          {
            label: 'NEXT REVIEW',
            value: reviewInfo.countdown || '--',
            sub: client?.next_review_date ? reviewInfo.text : 'Not scheduled',
          },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Checklist + Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        {/* Checklist */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Your checklist</h2>
          {checklist.length === 0 ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-1">
              {checklist.map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  {item.done ? (
                    <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle size={18} className="text-gray-300 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${item.done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-500">{item.sub}</p>
                  </div>
                  <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick actions</h2>
          <div className="space-y-1">
            {[
              { label: 'Review your property plan', sub: 'View scenarios', path: '/portal/property-plan' },
              { label: 'Update your profile', sub: 'Income, goals, preferences', path: '/portal/profile' },
              { label: 'View your portfolio', sub: 'Track your properties', path: '/portal/portfolio' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.sub}</p>
                </div>
                <ArrowRight size={14} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
