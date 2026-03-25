import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Home,
  MapPin,
  DollarSign,
  TrendingUp,
  Camera,
  CheckCircle2,
  Loader2,
  Building2,
  BarChart3,
  Wallet,
  Briefcase,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { LeftRail } from '../components/LeftRail'
import { TopBar } from '../components/TopBar'
import { InputDrawer } from '../components/InputDrawer'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { useClient, Client } from '../contexts/ClientContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CHART_COLORS, CHART_STYLE } from '../constants/chartColors'
import { calculatePerPropertyProjection, type TimelinePropertyData, type ProjectionConfig, type YearRow } from '../utils/perPropertyProjections'
import type { PropertyInstanceDetails } from '../types/propertyInstance'
import type { GrowthCurve } from '../types/property'

// --- Portfolio Types ---

interface PortfolioProperty {
  instanceId: string
  title: string
  state: string
  purchasePrice: number
  rentPerWeek: number
  growthAssumption: string
  affordableYear: number
  propertyNumber: number
  loanProduct: string
  interestRate: number
  lvr: number
  grossYield: number
  weeklyRent: number
  estimatedValue: number
  loanAmount: number
  equity: number
  netCashflow: number
  isPurchased: boolean
  purchaseAddress: string
  purchasePhoto: string
  deposit: number
  projectedEquity10Y: number
  growthSincePurchase: number
  propertyTypeKey: string
  // Raw data for projection engine
  rawPropertyInstance: PropertyInstanceDetails | null
  rawTimelineItem: TimelinePropertyData | null
}

interface ClientScenarioData {
  scenarioId: number
  scenarioName: string
  properties: PortfolioProperty[]
  growthCurve: GrowthCurve | null
}

// Shared avatar helpers
const AVATAR_COLORS = [
  '#2563EB', '#D97706', '#059669', '#DC2626', '#7C3AED', '#0891B2', '#EA580C', '#4F46E5',
]
const getAvatarColor = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
const formatCurrency = (value: number) => {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}m`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`
  return `${sign}$${abs.toFixed(0)}`
}

// Formatting helpers for projections

const formatExact = (value: number) => {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

const formatPct = (value: number) => `${value >= 0 ? '' : ''}${value.toFixed(1)}%`

const formatYAxis = (value: number) => {
  if (value === 0) return '$0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`
  return `${sign}$${abs}`
}

// Property images mapping
const PORTFOLIO_PROPERTY_IMAGES: Record<string, string> = {
  'Metro Houses': '/images/properties/metro-house.png',
  'Units / Apartments': '/images/properties/units-apartments.png',
  'Villas / Townhouses': '/images/properties/townhouses.png',
  'Houses (Regional)': '/images/properties/regional-house.png',
  'Duplexes': '/images/properties/duplex.png',
  'Small Blocks (3-4 Units)': '/images/properties/smaller-blocks-3-4.png',
  'Larger Blocks (10-20 Units)': '/images/properties/larger-blocks-10-20.png',
  'Commercial Property': '/images/properties/commercial-property.png',
}

const getPortfolioPropertyImage = (title: string): string | undefined => {
  if (PORTFOLIO_PROPERTY_IMAGES[title]) return PORTFOLIO_PROPERTY_IMAGES[title]
  const normalize = (s: string) => s.toLowerCase().replace(' focus', '').trim()
  const key = Object.keys(PORTFOLIO_PROPERTY_IMAGES).find(k => normalize(k) === normalize(title))
  return key ? PORTFOLIO_PROPERTY_IMAGES[key] : undefined
}

export const Portfolio = () => {
  const { propertyTypeTemplates } = useDataAssumptions()
  const { clients, activeClient: globalActiveClient } = useClient()
  const { companyId } = useAuth()

  // Use the global active client from ClientContext
  const activeClientId = globalActiveClient?.id || null
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [scenarioData, setScenarioData] = useState<Record<number, ClientScenarioData[]>>({})
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [purchaseStates, setPurchaseStates] = useState<Record<string, { isPurchased: boolean; address: string; photo: string }>>({})
  const [portfolioFilter, setPortfolioFilter] = useState<'all' | 'owned' | 'planned'>('all')
  const [detailProperty, setDetailProperty] = useState<{ property: PortfolioProperty; scenarioId: number } | null>(null)

  // Activate property modal state
  const [activateModalOpen, setActivateModalOpen] = useState(false)
  const [activatingProperty, setActivatingProperty] = useState<PortfolioProperty | null>(null)
  const [activatingScenarioId, setActivatingScenarioId] = useState<number | null>(null)
  const [activateAddress, setActivateAddress] = useState('')
  const [activatePhoto, setActivatePhoto] = useState('')
  const [saving, setSaving] = useState(false)

  // --- Portfolio Data Fetching ---
  useEffect(() => {
    if (clients.length === 0) return

    const fetchScenarios = async () => {
      setPortfolioLoading(true)
      try {
        const clientIds = clients.map(c => c.id)
        const { data: scenarios, error } = await supabase
          .from('scenarios')
          .select('id, client_id, name, data')
          .in('client_id', clientIds)
          .order('updated_at', { ascending: false })

        if (error) throw error

        const dataMap: Record<number, ClientScenarioData[]> = {}
        const purchaseMap: Record<string, { isPurchased: boolean; address: string; photo: string }> = {}

        scenarios?.forEach(scenario => {
          const sd = scenario.data as any
          if (!sd) return

          const clientId = scenario.client_id
          if (!dataMap[clientId]) dataMap[clientId] = []

          const properties: PortfolioProperty[] = []
          const timelineSnapshot = sd.timelineSnapshot
          const propertyInstances = sd.propertyInstances || {}
          const portfolioTracking = sd.portfolioTracking || {}
          const propertySelections = sd.propertySelections || {}
          const propertyOrder = sd.propertyOrder || []

          // Extract growth curve from scenario profile
          const scenarioProfile = sd.investmentProfile || {}
          const scenarioGrowthCurve: GrowthCurve | null = scenarioProfile.growthCurve || null

          // Helper to build a PortfolioProperty from instance data
          const buildProperty = (
            instanceId: string,
            title: string,
            instance: any,
            tracking: any,
            affordableYear: number,
            idx: number,
            cost?: number,
            timelineItem?: any,
          ) => {
            const purchasePrice = instance.purchasePrice || cost || 0
            const rentPerWeek = instance.rentPerWeek || 0
            const lvr = instance.lvr || 80
            const loanAmount = timelineItem?.loanAmount || purchasePrice * (lvr / 100)
            const deposit = timelineItem?.depositRequired || purchasePrice * ((100 - lvr) / 100)
            const interestRate = instance.interestRate || 6.5
            const annualInterest = loanAmount * (interestRate / 100)
            const annualRent = rentPerWeek * 52
            const grossYield = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0
            const growthRate = instance.growthAssumption === 'High' ? 7 : instance.growthAssumption === 'Low' ? 4 : 5.5
            const yearsHeld = Math.max(0, new Date().getFullYear() - Math.round(affordableYear))
            const estimatedValue = purchasePrice * Math.pow(1 + growthRate / 100, yearsHeld)
            const equity = estimatedValue - loanAmount
            const annualExpenses = annualInterest + (purchasePrice * 0.005)
            const netCashflow = annualRent - annualExpenses
            const growthSincePurchase = purchasePrice > 0 ? ((estimatedValue - purchasePrice) / purchasePrice) * 100 : 0
            const projectedEquity10Y = (purchasePrice * Math.pow(1 + growthRate / 100, 10)) - loanAmount

            // Build raw timeline item data for projection engine
            const rawTimelineItem: TimelinePropertyData | null = timelineItem ? {
              title: timelineItem.title || title,
              cost: timelineItem.cost || purchasePrice,
              loanAmount: timelineItem.loanAmount || loanAmount,
              depositRequired: timelineItem.depositRequired || deposit,
              period: timelineItem.period || 1,
              affordableYear: timelineItem.affordableYear || affordableYear,
              displayPeriod: timelineItem.displayPeriod || `${affordableYear}`,
              loanType: timelineItem.loanType || instance.loanProduct || 'IO',
              acquisitionCosts: timelineItem.acquisitionCosts || undefined,
              upfrontCosts: timelineItem.upfrontCosts || undefined,
            } : null

            // Build raw property instance — use stored instance if it has required fields
            const hasFullInstance = instance.rentPerWeek !== undefined && instance.interestRate !== undefined
            const rawPropertyInstance: PropertyInstanceDetails | null = hasFullInstance ? {
              state: instance.state || 'NSW',
              purchasePrice: instance.purchasePrice || purchasePrice,
              valuationAtPurchase: instance.valuationAtPurchase || instance.purchasePrice || purchasePrice,
              rentPerWeek: instance.rentPerWeek || 0,
              growthAssumption: instance.growthAssumption || 'Medium',
              minimumYield: instance.minimumYield || 5,
              daysToUnconditional: instance.daysToUnconditional || 21,
              daysForSettlement: instance.daysForSettlement || 42,
              lvr: instance.lvr || 80,
              lmiWaiver: instance.lmiWaiver || false,
              loanProduct: instance.loanProduct || 'IO',
              interestRate: instance.interestRate || 6.5,
              loanTerm: instance.loanTerm || 30,
              loanOffsetAccount: instance.loanOffsetAccount || 0,
              engagementFee: instance.engagementFee || 0,
              conditionalHoldingDeposit: instance.conditionalHoldingDeposit || 0,
              buildingInsuranceUpfront: instance.buildingInsuranceUpfront || 0,
              buildingPestInspection: instance.buildingPestInspection || 0,
              plumbingElectricalInspections: instance.plumbingElectricalInspections || 0,
              independentValuation: instance.independentValuation || 0,
              unconditionalHoldingDeposit: instance.unconditionalHoldingDeposit || 0,
              mortgageFees: instance.mortgageFees || 0,
              conveyancing: instance.conveyancing || 0,
              ratesAdjustment: instance.ratesAdjustment || 0,
              maintenanceAllowancePostSettlement: instance.maintenanceAllowancePostSettlement || 0,
              stampDutyOverride: instance.stampDutyOverride ?? null,
              vacancyRate: instance.vacancyRate ?? 2,
              propertyManagementPercent: instance.propertyManagementPercent ?? 6.6,
              buildingInsuranceAnnual: instance.buildingInsuranceAnnual ?? 350,
              councilRatesWater: instance.councilRatesWater ?? 2000,
              strata: instance.strata ?? 0,
              maintenanceAllowanceAnnual: instance.maintenanceAllowanceAnnual ?? 0,
              landTaxOverride: instance.landTaxOverride ?? null,
              potentialDeductionsRebates: instance.potentialDeductionsRebates ?? 0,
            } : null

            return {
              instanceId,
              title,
              state: instance.state || 'NSW',
              purchasePrice,
              rentPerWeek,
              growthAssumption: instance.growthAssumption || 'Medium',
              affordableYear,
              propertyNumber: idx + 1,
              loanProduct: instance.loanProduct || 'IO',
              interestRate,
              lvr,
              grossYield,
              weeklyRent: rentPerWeek,
              estimatedValue,
              loanAmount,
              equity,
              netCashflow,
              isPurchased: tracking.isPurchased || false,
              purchaseAddress: tracking.address || '',
              purchasePhoto: tracking.photo || '',
              deposit,
              projectedEquity10Y,
              growthSincePurchase,
              propertyTypeKey: title,
              rawPropertyInstance,
              rawTimelineItem,
            } as PortfolioProperty
          }

          // Check for feasible items in timelineSnapshot
          const feasibleSnapshot = timelineSnapshot && Array.isArray(timelineSnapshot)
            ? timelineSnapshot.filter((item: any) => item.status === 'feasible' && item.affordableYear !== Infinity)
            : []

          if (feasibleSnapshot.length > 0) {
            feasibleSnapshot
              .sort((a: any, b: any) => (a.affordableYear || 0) - (b.affordableYear || 0))
              .forEach((item: any, idx: number) => {
                const instanceId = item.instanceId || item.id || `prop_${idx}`
                const instance = propertyInstances[instanceId] || {}
                const tracking = portfolioTracking[instanceId] || {}
                const prop = buildProperty(instanceId, item.title || `Property ${idx + 1}`, instance, tracking, Math.round(item.affordableYear || 2025), idx, item.cost, item)
                properties.push(prop)
                purchaseMap[`${scenario.id}_${instanceId}`] = {
                  isPurchased: tracking.isPurchased || false,
                  address: tracking.address || '',
                  photo: tracking.photo || '',
                }
              })
          } else if (propertyOrder.length > 0 || Object.keys(propertySelections).length > 0) {
            let instanceIds: string[] = propertyOrder.length > 0 ? propertyOrder : []
            if (instanceIds.length === 0) {
              Object.entries(propertySelections).forEach(([propId, qty]) => {
                const count = qty as number
                for (let i = 0; i < count; i++) {
                  instanceIds.push(`${propId}_instance_${i}`)
                }
              })
            }

            const baseYear = 2025
            const profile = sd.investmentProfile || {}
            const annualSavings = profile.annualSavings || 50000

            instanceIds.forEach((instanceId: string, idx: number) => {
              const instance = propertyInstances[instanceId] || {}
              const tracking = portfolioTracking[instanceId] || {}
              const propTypeMatch = instanceId.match(/^(property_\d+)_instance_\d+$/)
              const propTypeId = propTypeMatch ? propTypeMatch[1] : instanceId
              const propIndex = propTypeId.match(/property_(\d+)/)
              const templateIndex = propIndex ? parseInt(propIndex[1], 10) : -1
              const template = templateIndex >= 0 ? propertyTypeTemplates[templateIndex] : null
              const title = template ? template.propertyType : instance.title || `Property ${idx + 1}`
              const estimatedYear = baseYear + Math.max(1, Math.ceil(((idx + 1) * (instance.purchasePrice || 400000) * 0.2) / annualSavings))

              const prop = buildProperty(instanceId, title, instance, tracking, estimatedYear, idx)
              properties.push(prop)
              purchaseMap[`${scenario.id}_${instanceId}`] = {
                isPurchased: tracking.isPurchased || false,
                address: tracking.address || '',
                photo: tracking.photo || '',
              }
            })
          }

          dataMap[clientId].push({
            scenarioId: scenario.id,
            scenarioName: scenario.name || 'Scenario',
            properties,
            growthCurve: scenarioGrowthCurve,
          })
        })

        setScenarioData(dataMap)
        setPurchaseStates(prev => ({ ...prev, ...purchaseMap }))
      } catch {
        // Silently fail
      }
      setPortfolioLoading(false)
    }

    fetchScenarios()
  }, [clients])

  // Active client data
  const activeClient = globalActiveClient
  const activeScenarios = activeClientId ? scenarioData[activeClientId] || [] : []

  // Portfolio summary
  const portfolioSummary = useMemo(() => {
    if (!activeClientId) return null
    const allProps = activeScenarios.flatMap(s =>
      s.properties.map(p => ({ ...p, key: `${s.scenarioId}_${p.instanceId}` }))
    )
    const purchased = allProps.filter(p => purchaseStates[p.key]?.isPurchased)
    const planned = allProps.filter(p => !purchaseStates[p.key]?.isPurchased)
    const combinedValue = purchased.reduce((sum, p) => sum + p.estimatedValue, 0)
      + planned.reduce((sum, p) => sum + p.purchasePrice, 0)
    const totalEquity = purchased.reduce((sum, p) => sum + p.equity, 0)
    const totalCashflow = allProps.reduce((sum, p) => sum + p.netCashflow, 0)
    return {
      totalProperties: allProps.length,
      purchasedCount: purchased.length,
      plannedCount: planned.length,
      combinedValue,
      totalEquity,
      totalCashflow,
    }
  }, [activeClientId, activeScenarios, purchaseStates])

  // Handle toggle purchase
  const handleActivateProperty = (scenarioId: number, property: PortfolioProperty) => {
    const key = `${scenarioId}_${property.instanceId}`
    const current = purchaseStates[key]

    if (current?.isPurchased) {
      setPurchaseStates(prev => ({ ...prev, [key]: { ...prev[key], isPurchased: false } }))
      savePortfolioTracking(scenarioId, property.instanceId, false, current.address, current.photo)
      toast.success(`${property.title} marked as not yet purchased`)
    } else {
      setActivatingProperty(property)
      setActivateAddress(current?.address || '')
      setActivatePhoto(current?.photo || '')
      setActivatingScenarioId(scenarioId)
      setActivateModalOpen(true)
    }
  }

  const handleConfirmActivate = async () => {
    if (!activatingProperty || !activatingScenarioId) return
    setSaving(true)
    const key = `${activatingScenarioId}_${activatingProperty.instanceId}`
    setPurchaseStates(prev => ({
      ...prev,
      [key]: { isPurchased: true, address: activateAddress, photo: activatePhoto },
    }))
    await savePortfolioTracking(activatingScenarioId, activatingProperty.instanceId, true, activateAddress, activatePhoto)
    setSaving(false)
    setActivateModalOpen(false)
    setActivatingProperty(null)
    setActivatingScenarioId(null)
    toast.success(`${activatingProperty.title} marked as purchased!`)
  }

  const savePortfolioTracking = async (
    scenarioId: number, instanceId: string,
    isPurchased: boolean, address: string, photo: string
  ) => {
    try {
      const { data: scenario, error } = await supabase
        .from('scenarios')
        .select('data')
        .eq('id', scenarioId)
        .single()
      if (error || !scenario) return

      const currentData = scenario.data as any || {}
      const portfolioTracking = currentData.portfolioTracking || {}
      portfolioTracking[instanceId] = { isPurchased, address, photo }

      await supabase
        .from('scenarios')
        .update({ data: { ...currentData, portfolioTracking } })
        .eq('id', scenarioId)
    } catch {
      // Silently fail
    }
  }

  return (
    <div className="main-app flex h-screen w-full bg-[#f9fafb]">
      <LeftRail />
      <InputDrawer
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen(o => !o)}
      />

      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
        drawerOpen ? 'ml-[352px]' : 'ml-16'
      }`}>
        <TopBar />

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="px-12 py-6">
            {portfolioLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : !activeClient ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Building2 size={48} className="text-gray-300 mb-4" />
                <h2 className="page-title text-gray-400">Portfolio</h2>
                <p className="body-secondary mt-1">
                  {clients.length === 0
                    ? 'No clients yet. Add a client to get started.'
                    : 'Select a client to view their portfolio.'
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Page header */}
                <div className="mb-6">
                  <h1 className="page-title">Portfolio</h1>
                </div>

                {/* Summary stat cards */}
                {portfolioSummary && (
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <span className="metric-label">Properties</span>
                      <div className="mt-1">
                        <span className="stat-number">{portfolioSummary.totalProperties}</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <span className="metric-label">Combined Value</span>
                      <div className="mt-1">
                        <span className="stat-number">{formatCurrency(portfolioSummary.combinedValue)}</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <span className="metric-label">Total Equity (now)</span>
                      <div className="mt-1">
                        <span className="stat-number text-green-600">{formatCurrency(portfolioSummary.totalEquity)}</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <span className="metric-label">Annual Cashflow</span>
                      <div className="mt-1">
                        <span className={`stat-number ${portfolioSummary.totalCashflow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {portfolioSummary.totalCashflow >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalCashflow)}/yr
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter tabs + legend */}
                {portfolioSummary && portfolioSummary.totalProperties > 0 && (
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-1">
                      {(['all', 'owned', 'planned'] as const).map(filter => {
                        const count = filter === 'all'
                          ? portfolioSummary.totalProperties
                          : filter === 'owned'
                            ? portfolioSummary.purchasedCount
                            : portfolioSummary.plannedCount
                        return (
                          <button
                            key={filter}
                            onClick={() => setPortfolioFilter(filter)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              portfolioFilter === filter
                                ? 'bg-[#374151] text-white'
                                : 'bg-white border border-gray-200 text-[#6B7280] hover:border-gray-300'
                            }`}
                          >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)} ({count})
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <span className="meta">Owned</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#374151]" />
                        <span className="meta">Planned</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Property cards */}
                {activeScenarios.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                    <Home size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="body-secondary">No scenarios found for this client</p>
                    <p className="meta mt-1">Create a scenario in the Dashboard first</p>
                  </div>
                ) : (() => {
                  // Split into owned and planned
                  const allCards = activeScenarios.flatMap(scenario =>
                    scenario.properties.map(property => {
                      const key = `${scenario.scenarioId}_${property.instanceId}`
                      const trackingState = purchaseStates[key]
                      const isPurchased = trackingState?.isPurchased || false
                      return { scenario, property, key, trackingState, isPurchased }
                    })
                  )
                  const ownedCards = allCards.filter(c => c.isPurchased)
                  const plannedCards = allCards.filter(c => !c.isPurchased)
                  const showOwned = portfolioFilter === 'all' || portfolioFilter === 'owned'
                  const showPlanned = portfolioFilter === 'all' || portfolioFilter === 'planned'

                  return (
                    <div className="space-y-8">
                      {/* OWNED PROPERTIES — compound calculator layout */}
                      {showOwned && ownedCards.length > 0 && (
                        <div className="space-y-8">
                          {portfolioFilter === 'all' && <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Properties</h3>}
                          {ownedCards.map(({ scenario, property, key, trackingState }) => {
                            const propertyImage = getPortfolioPropertyImage(property.propertyTypeKey || property.title)

                            // Use real calculation engine if we have the raw data, otherwise skip
                            const scenarioData = activeScenarios.find(s => s.scenarioId === scenario.scenarioId)
                            const defaultGrowthCurve: GrowthCurve = { year1: 12.5, years2to3: 10, year4: 7.5, year5plus: 6 }
                            const growthCurve = scenarioData?.growthCurve || defaultGrowthCurve

                            // Build timeline data from raw or reconstructed
                            const timelineData: TimelinePropertyData = property.rawTimelineItem || {
                              title: property.title,
                              cost: property.purchasePrice,
                              loanAmount: property.loanAmount,
                              depositRequired: property.deposit,
                              period: 1,
                              affordableYear: property.affordableYear,
                              displayPeriod: `${property.affordableYear}`,
                              loanType: (property.loanProduct as 'IO' | 'PI') || 'IO',
                            }

                            // Build property instance from raw or reconstructed
                            const propInstance: PropertyInstanceDetails = property.rawPropertyInstance || {
                              state: property.state || 'NSW',
                              purchasePrice: property.purchasePrice,
                              valuationAtPurchase: property.purchasePrice,
                              rentPerWeek: property.rentPerWeek,
                              growthAssumption: (property.growthAssumption as 'High' | 'Medium' | 'Low') || 'Medium',
                              minimumYield: 5,
                              daysToUnconditional: 21,
                              daysForSettlement: 42,
                              lvr: property.lvr,
                              lmiWaiver: false,
                              loanProduct: (property.loanProduct as 'IO' | 'PI') || 'IO',
                              interestRate: property.interestRate,
                              loanTerm: 30,
                              loanOffsetAccount: 0,
                              engagementFee: 0,
                              conditionalHoldingDeposit: 0,
                              buildingInsuranceUpfront: 0,
                              buildingPestInspection: 0,
                              plumbingElectricalInspections: 0,
                              independentValuation: 0,
                              unconditionalHoldingDeposit: 0,
                              mortgageFees: 0,
                              conveyancing: 0,
                              ratesAdjustment: 0,
                              maintenanceAllowancePostSettlement: 0,
                              stampDutyOverride: null,
                              vacancyRate: 2,
                              propertyManagementPercent: 6.6,
                              buildingInsuranceAnnual: 350,
                              councilRatesWater: 2000,
                              strata: 0,
                              maintenanceAllowanceAnnual: 0,
                              landTaxOverride: null,
                              potentialDeductionsRebates: 0,
                            }

                            const projection = calculatePerPropertyProjection(timelineData, propInstance, { growthCurve, projectionYears: 10 })

                            // Aliases for template compatibility
                            const proj = {
                              years: projection.yearRows,
                              cashInvested: projection.totalCashInvested,
                              capitalReturnedInYears: projection.capitalReturnedInYears,
                              annualRent: projection.cashflowOverTime[0]?.grossIncome || 0,
                              annualInterest: projection.cashflowOverTime[0]?.loanInterest || 0,
                              annualOperating: projection.cashflowOverTime[0]?.totalExpenses || 0,
                              annualTotalExpenses: (projection.cashflowOverTime[0]?.loanInterest || 0) + (projection.cashflowOverTime[0]?.totalExpenses || 0),
                            }
                            const yr1 = proj.years[0]
                            const yr5 = proj.years[4]
                            const yr10 = proj.years[9]

                            // Chart data from projections
                            const chartData = [
                              { year: property.affordableYear.toString(), capitalGrowthCum: 0, netCashflowCum: 0, totalPerformance: 0 },
                              ...proj.years.map(y => ({
                                year: y.yearLabel,
                                capitalGrowthCum: y.capitalGrowthCumulative,
                                netCashflowCum: y.netCashflowCumulative,
                                totalPerformance: y.totalPerformance,
                              }))
                            ]

                            return (
                              <div key={key} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                {/* Property Header */}
                                <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                                  <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                    {trackingState?.photo ? (
                                      <img src={trackingState.photo} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                    ) : propertyImage ? (
                                      <img src={propertyImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center"><Home size={16} className="text-gray-300" /></div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-gray-900 truncate">{trackingState?.address || property.title}</h4>
                                    <p className="text-[11px] text-gray-500">{property.state} · Purchased {property.affordableYear} · {formatExact(property.purchasePrice)}</p>
                                  </div>
                                  <span className="bg-green-500 text-white text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded flex-shrink-0">Owned</span>
                                  <button onClick={(e) => { e.stopPropagation(); handleActivateProperty(scenario.scenarioId, property) }} className="w-9 h-5 rounded-full bg-green-500 transition-colors flex-shrink-0" title="Mark as not purchased">
                                    <div className="relative top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow translate-x-4" />
                                  </button>
                                </div>

                                {/* Top Section: Cash In/Out (left) + Chart & Performance Summary (right) */}
                                <div className="flex flex-col lg:flex-row border-b border-gray-100">
                                  {/* LEFT: Cash In / Cash Out */}
                                  <div className="lg:w-[280px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100">
                                    {/* Cash In */}
                                    <div className="px-5 pt-4 pb-3">
                                      <h5 className="text-[11px] font-semibold text-gray-900 uppercase tracking-wider mb-2">Cash In</h5>
                                      <div className="space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-xs text-gray-500">Weekly Rental Income</span>
                                          <span className="text-xs font-medium text-gray-900">${property.rentPerWeek}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-xs text-gray-500">Gross Annual Rental Income</span>
                                          <span className="text-xs font-medium text-gray-900">{formatExact(proj.annualRent)}</span>
                                        </div>
                                      </div>
                                      <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
                                        <span className="text-xs font-medium text-gray-700">Gross Annual Property Income</span>
                                        <span className="text-xs font-semibold text-gray-900">{formatExact(proj.annualRent)}</span>
                                      </div>
                                    </div>

                                    {/* Cash Out */}
                                    <div className="px-5 pb-3 pt-2 border-t border-gray-100">
                                      <h5 className="text-[11px] font-semibold text-gray-900 uppercase tracking-wider mb-2">Cash Out</h5>
                                      <div className="space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-xs text-gray-500">Loan Interest</span>
                                          <span className="text-xs font-medium text-gray-900">{formatExact(proj.annualInterest)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-xs text-gray-500">Operating Expenses</span>
                                          <span className="text-xs font-medium text-gray-900">{formatExact(proj.annualOperating)}</span>
                                        </div>
                                      </div>
                                      <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
                                        <span className="text-xs font-medium text-gray-700">Total Annual Cash Expenses</span>
                                        <span className="text-xs font-semibold text-gray-900">{formatExact(proj.annualTotalExpenses)}</span>
                                      </div>
                                    </div>

                                    {/* Net position */}
                                    <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/50">
                                      <div className="flex justify-between">
                                        <span className="text-xs font-semibold text-gray-700">Net Annual Cashflow</span>
                                        <span className={`text-xs font-bold ${yr1.netCashflow >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatExact(yr1.netCashflow)}</span>
                                      </div>
                                      <div className="flex justify-between mt-1">
                                        <span className="text-xs text-gray-500">Monthly</span>
                                        <span className={`text-xs font-semibold ${yr1.monthlyCost >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatExact(yr1.monthlyCost)}/mo</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* RIGHT: Chart + Performance Summary */}
                                  <div className="flex-1 min-w-0 flex flex-col">
                                    {/* Chart */}
                                    <div className="p-4 flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-[11px] font-semibold text-gray-900 uppercase tracking-wider">Total Performance Projections</h5>
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1"><div className="w-3 h-[2px] rounded" style={{ backgroundColor: CHART_COLORS.primary }} /><span className="text-[10px] text-gray-400">Capital Growth</span></div>
                                          <div className="flex items-center gap-1"><div className="w-3 h-[2px] rounded" style={{ backgroundColor: CHART_COLORS.secondary }} /><span className="text-[10px] text-gray-400">Net Cashflow</span></div>
                                          <div className="flex items-center gap-1"><div className="w-3 h-[2px] rounded" style={{ backgroundColor: CHART_COLORS.lineBlue }} /><span className="text-[10px] text-gray-400">Total Performance</span></div>
                                        </div>
                                      </div>
                                      <ResponsiveContainer width="100%" height={180}>
                                        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                                          <CartesianGrid {...CHART_STYLE.grid} />
                                          <XAxis dataKey="year" {...CHART_STYLE.xAxis} />
                                          <YAxis tickFormatter={formatYAxis} {...CHART_STYLE.yAxis} />
                                          <Tooltip
                                            contentStyle={{ backgroundColor: 'white', border: `1px solid ${CHART_COLORS.tooltipBorder}`, borderRadius: '6px', fontSize: '11px' }}
                                            formatter={(value: number) => formatExact(value)}
                                          />
                                          <Line type="monotone" dataKey="capitalGrowthCum" stroke={CHART_COLORS.primary} strokeWidth={2} name="Capital Growth" dot={false} />
                                          <Line type="monotone" dataKey="netCashflowCum" stroke={CHART_COLORS.secondary} strokeWidth={2} name="Net Cashflow" dot={false} />
                                          <Line type="monotone" dataKey="totalPerformance" stroke={CHART_COLORS.lineBlue} strokeWidth={2.5} name="Total Performance" dot={false} />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>

                                    {/* Performance Summary — right side below chart */}
                                    <div className="px-4 pb-4 pt-0">
                                      <div className="grid grid-cols-3 gap-4 border border-gray-200 rounded-lg overflow-hidden">
                                        {/* Total Performance */}
                                        <div className="p-3 border-r border-gray-200">
                                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Total Performance</div>
                                          <div className="text-[10px] text-gray-400 mb-0.5">(Growth + Net Cashflow)</div>
                                          <div className="space-y-0.5 mt-2">
                                            {[{ l: 'Year 1', v: yr1.totalPerformance }, { l: 'Year 5', v: yr5.totalPerformance }, { l: 'Year 10', v: yr10.totalPerformance }].map(r => (
                                              <div key={r.l} className="flex justify-between"><span className="text-[11px] text-gray-500">{r.l}</span><span className="text-[11px] font-semibold text-gray-900">{formatExact(r.v)}</span></div>
                                            ))}
                                          </div>
                                        </div>
                                        {/* Cash on Cash Return */}
                                        <div className="p-3 border-r border-gray-200">
                                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cash On Cash Return</div>
                                          <div className="text-[10px] text-gray-400 mb-0.5">(COC)</div>
                                          <div className="space-y-0.5 mt-2">
                                            {[{ l: 'Year 1', v: yr1.cocReturnCumulative }, { l: 'Year 5', v: yr5.cocReturnCumulative }, { l: 'Year 10', v: yr10.cocReturnCumulative }].map(r => (
                                              <div key={r.l} className="flex justify-between"><span className="text-[11px] text-gray-500">{r.l}</span><span className={`text-[11px] font-semibold ${r.v >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{formatPct(r.v)}</span></div>
                                            ))}
                                          </div>
                                        </div>
                                        {/* ROIC + Capital Returned */}
                                        <div className="p-3">
                                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Return on Invested Capital</div>
                                          <div className="space-y-0.5 mt-2">
                                            {[{ l: 'Year 1', v: yr1.roic }, { l: 'Year 5', v: yr5.roic }, { l: 'Year 10', v: yr10.roic }].map(r => (
                                              <div key={r.l} className="flex justify-between"><span className="text-[11px] text-gray-500">{r.l}</span><span className="text-[11px] font-semibold text-gray-900">{formatPct(r.v)}</span></div>
                                            ))}
                                          </div>
                                          <div className="mt-2 pt-2 border-t border-gray-100">
                                            <div className="text-[10px] text-gray-500">Initial capital returned in:</div>
                                            <div className="text-sm font-bold text-blue-600 mt-0.5">{proj.capitalReturnedInYears} {proj.capitalReturnedInYears === 1 ? 'year' : 'years'}</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Year-by-Year Table */}
                                <div className="px-5 py-4">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b-2 border-gray-200">
                                          <th className="text-left py-2 pr-4 font-semibold text-gray-700 sticky left-0 bg-white min-w-[180px]"></th>
                                          {proj.years.map(y => (
                                            <th key={y.year} className="text-right py-2 px-2 font-semibold text-gray-700 min-w-[85px]">{y.year}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {[
                                          { label: 'Property Value', key: 'propertyValue', format: formatExact },
                                          { label: 'Equity', key: 'equity', format: formatExact, highlight: true },
                                          { label: 'Gross Income', key: 'grossIncome', format: formatExact },
                                          { label: 'Net Cashflow', key: 'netCashflow', format: formatExact, colorize: true },
                                          { label: 'Income/(Cost) Per Month', key: 'monthlyCost', format: formatExact, colorize: true },
                                          { label: 'Capital Growth (cumulative)', key: 'capitalGrowthCumulative', format: formatExact },
                                          { label: 'Total Performance', key: 'totalPerformance', format: formatExact, highlight: true },
                                          { label: 'Cash on Cash Return (cum.)', key: 'cocReturnCumulative', format: formatPct, colorize: true },
                                          { label: 'Return on Invested Capital', key: 'roic', format: formatPct },
                                        ].map(row => (
                                          <tr key={row.label} className={`border-b border-gray-100 ${row.highlight ? 'bg-gray-50/50' : ''}`}>
                                            <td className={`py-2 pr-4 sticky left-0 whitespace-nowrap ${row.highlight ? 'font-semibold text-gray-800 bg-gray-50/50' : 'font-medium text-gray-600 bg-white'}`}>{row.label}</td>
                                            {proj.years.map(y => {
                                              const val = y[row.key as keyof YearRow] as number
                                              const isNeg = val < 0
                                              return (
                                                <td key={y.year} className={`text-right py-2 px-2 font-medium tabular-nums ${
                                                  row.colorize ? (isNeg ? 'text-red-500' : 'text-green-600') : row.highlight ? 'text-gray-900 font-semibold' : 'text-gray-700'
                                                }`}>
                                                  {row.format(val)}
                                                </td>
                                              )
                                            })}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* PLANNED PROPERTIES — compact grid */}
                      {showPlanned && plannedCards.length > 0 && (
                        <div className="space-y-4">
                          {portfolioFilter === 'all' && <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Plan</h3>}
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {plannedCards.map(({ scenario, property, key }) => {
                              const propertyImage = getPortfolioPropertyImage(property.propertyTypeKey || property.title)
                              return (
                                <div
                                  key={key}
                                  className="flex flex-col rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition-colors opacity-60"
                                >
                                  <div className="relative h-36 bg-[#f0f4f8] overflow-hidden flex items-center justify-center">
                                    {propertyImage ? (
                                      <img src={propertyImage} alt={property.title} className="h-24 object-contain opacity-60" />
                                    ) : (
                                      <Home size={36} className="text-gray-300" />
                                    )}
                                    <span className="absolute top-2.5 left-2.5 bg-[#374151] text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded">Planned</span>
                                    <span className="absolute top-2.5 right-12 bg-white border border-gray-200 text-[#374151] text-[10px] font-medium px-2 py-0.5 rounded-full">Buy {property.affordableYear}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleActivateProperty(scenario.scenarioId, property) }} className="absolute top-2.5 right-2.5 w-9 h-5 rounded-full bg-gray-300 transition-colors" title="Mark as purchased">
                                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform translate-x-0" />
                                    </button>
                                  </div>
                                  <div className="bg-white px-4 py-3">
                                    <h4 className="text-sm font-semibold text-gray-900 truncate">{property.title}</h4>
                                    <p className="text-[10px] font-medium text-gray-500 mt-0.5">Template · {property.growthAssumption} Growth Zone</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5 pt-2.5 border-t border-gray-100">
                                      <div>
                                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Purchase Price</div>
                                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(property.purchasePrice)}</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Deposit ({100 - property.lvr}%)</div>
                                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(property.deposit)}</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Est. Cashflow</div>
                                        <div className={`text-sm font-semibold ${property.netCashflow >= 0 ? 'text-green-600' : 'text-red-500'}`}>{property.netCashflow >= 0 ? '+' : ''}{formatCurrency(property.netCashflow)}/yr</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Proj. Equity (10Y)</div>
                                        <div className="text-sm font-semibold text-green-600">{formatCurrency(property.projectedEquity10Y)}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Property Detail Drawer */}
                {detailProperty && (() => {
                  const dp = detailProperty.property
                  const dKey = `${detailProperty.scenarioId}_${dp.instanceId}`
                  const dTracking = purchaseStates[dKey]
                  const dIsPurchased = dTracking?.isPurchased || false
                  const annualRent = dp.weeklyRent * 52
                  const annualInterest = dp.loanAmount * (dp.interestRate / 100)
                  const annualExpenses = annualInterest + (dp.purchasePrice * 0.005)
                  const growthRate = dp.growthAssumption === 'High' ? 7 : dp.growthAssumption === 'Low' ? 4 : 5.5
                  const yearsHeld = Math.max(0, new Date().getFullYear() - dp.affordableYear)
                  const compoundGrowthPA = yearsHeld > 0 ? growthRate : 0
                  const borrowableEquity = Math.max(0, (dp.estimatedValue * 0.8) - dp.loanAmount)

                  return (
                    <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetailProperty(null)}>
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="relative w-full max-w-lg bg-[#f9fafb] h-full overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="relative h-48 bg-gray-200 overflow-hidden">
                          {dIsPurchased && dTracking?.photo ? (
                            <img src={dTracking.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#f0f4f8] flex items-center justify-center">
                              {(() => {
                                const img = getPortfolioPropertyImage(dp.propertyTypeKey || dp.title)
                                return img ? <img src={img} alt="" className="h-32 object-contain opacity-60" /> : <Home size={48} className="text-gray-300" />
                              })()}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <div className="absolute bottom-4 left-4 text-white">
                            <h3 className="text-lg font-semibold">{dIsPurchased && dTracking?.address ? dTracking.address : dp.title}</h3>
                            <p className="text-xs text-white/80">{dp.state}</p>
                          </div>
                          <button onClick={() => setDetailProperty(null)} className="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors">✕</button>
                          <div className="absolute top-3 left-3">
                            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded ${dIsPurchased ? 'bg-green-500 text-white' : 'bg-[#374151] text-white'}`}>{dIsPurchased ? 'Owned' : 'Planned'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white">
                          <button onClick={() => handleActivateProperty(detailProperty.scenarioId, dp)} className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${dIsPurchased ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
                            {dIsPurchased ? 'Mark as Not Purchased' : 'Mark as Purchased'}
                          </button>
                        </div>

                        <div className="p-6 space-y-5">
                          <div>
                            <h4 className="section-heading mb-3">Property Details</h4>
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                              <div className="grid grid-cols-2 divide-x divide-gray-100">
                                <div className="px-4 py-3 border-b border-gray-100">
                                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Purchase Year</div>
                                  <div className="text-sm font-medium text-gray-900 mt-0.5">{dp.affordableYear}</div>
                                </div>
                                <div className="px-4 py-3 border-b border-gray-100">
                                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Property Type</div>
                                  <div className="text-sm font-medium text-gray-900 mt-0.5">{dp.title}</div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 divide-x divide-gray-100">
                                <div className="px-4 py-3 border-b border-gray-100">
                                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Growth Zone</div>
                                  <div className="text-sm font-medium text-gray-900 mt-0.5">{dp.growthAssumption}</div>
                                </div>
                                <div className="px-4 py-3 border-b border-gray-100">
                                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">State</div>
                                  <div className="text-sm font-medium text-gray-900 mt-0.5">{dp.state}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="section-heading mb-3">Loan Details</h4>
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                              <div className="grid grid-cols-2 divide-x divide-gray-100">
                                <div className="px-4 py-3 border-b border-gray-100">
                                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Interest Rate</div>
                                  <div className="text-sm font-medium text-gray-900 mt-0.5">{dp.interestRate.toFixed(2)}%</div>
                                </div>
                                <div className="px-4 py-3 border-b border-gray-100">
                                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Loan Type</div>
                                  <div className="text-sm font-medium text-gray-900 mt-0.5">{dp.loanProduct === 'IO' ? 'Interest Only' : 'P&I'}</div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 divide-x divide-gray-100">
                                <div className="px-4 py-3">
                                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">LVR</div>
                                  <div className="text-sm font-medium text-gray-900 mt-0.5">{dp.lvr}%</div>
                                </div>
                                <div className="px-4 py-3">
                                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Loan Amount</div>
                                  <div className="text-sm font-medium text-gray-900 mt-0.5">{formatCurrency(dp.loanAmount)}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="section-heading mb-3">Rental Details</h4>
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                              <div className="grid grid-cols-2 divide-x divide-gray-100">
                                <div className="px-4 py-3 border-b border-gray-100">
                                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Rental Income</div>
                                  <div className="text-sm font-medium text-gray-900 mt-0.5">${dp.weeklyRent}/wk</div>
                                </div>
                                <div className="px-4 py-3 border-b border-gray-100">
                                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Rental Yield</div>
                                  <div className="text-sm font-medium text-gray-900 mt-0.5">{dp.grossYield.toFixed(2)}%</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="section-heading mb-3">Financial Summary</h4>
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                              {[
                                { label: 'Purchase Price', value: formatCurrency(dp.purchasePrice) },
                                { label: 'Current Value', value: formatCurrency(dp.estimatedValue) },
                                ...(dIsPurchased && dp.growthSincePurchase > 0 ? [{ label: 'Growth Since Purchase', value: `${dp.growthSincePurchase.toFixed(1)}%`, color: 'text-green-600' }] : []),
                                ...(dIsPurchased && compoundGrowthPA > 0 ? [{ label: 'Compound Growth Rate PA', value: `${compoundGrowthPA.toFixed(1)}%` }] : []),
                                { label: 'Current Loan', value: formatCurrency(dp.loanAmount) },
                                { label: 'Loan to Value Ratio', value: `${dp.lvr}%` },
                                { label: 'Total Equity', value: formatCurrency(dp.equity), color: 'text-green-600' },
                                { label: 'Borrowable Equity 80% LVR', value: formatCurrency(borrowableEquity), color: 'text-green-600' },
                                { label: 'Income PA', value: formatCurrency(annualRent) },
                                { label: 'Expenses PA', value: formatCurrency(annualExpenses) },
                                { label: 'Cashflow PA', value: `${dp.netCashflow >= 0 ? '+' : ''}${formatCurrency(dp.netCashflow)}`, color: dp.netCashflow >= 0 ? 'text-green-600' : 'text-red-500' },
                              ].map((row, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-3">
                                  <span className="text-sm text-gray-600">{row.label}</span>
                                  <span className={`text-sm font-semibold ${(row as any).color || 'text-gray-900'}`}>{row.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activate Property Modal */}
      <Dialog open={activateModalOpen} onOpenChange={setActivateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Purchased</DialogTitle>
            <DialogDescription>
              Enter the property details for {activatingProperty?.title}. This marks it as a real purchase in the client's portfolio.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="purchase-address">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-gray-400" />
                  Property Address
                </div>
              </Label>
              <Input id="purchase-address" value={activateAddress} onChange={(e) => setActivateAddress(e.target.value)} placeholder="e.g. 42 Smith Street, Richmond VIC 3121" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="purchase-photo">
                <div className="flex items-center gap-1.5">
                  <Camera size={14} className="text-gray-400" />
                  Property Photo URL
                </div>
              </Label>
              <Input id="purchase-photo" value={activatePhoto} onChange={(e) => setActivatePhoto(e.target.value)} placeholder="https://example.com/photo.jpg" />
              {activatePhoto && (
                <div className="mt-1 h-24 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                  <img src={activatePhoto} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActivateModalOpen(false); setActivatingProperty(null); setActivatingScenarioId(null) }}>Cancel</Button>
            <Button onClick={handleConfirmActivate} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? (<><Loader2 size={14} className="animate-spin mr-1.5" />Saving...</>) : (<><CheckCircle2 size={14} className="mr-1.5" />Mark as Purchased</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
