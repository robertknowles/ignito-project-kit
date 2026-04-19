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
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { LeftRail } from '../components/LeftRail'
import { TopBar } from '../components/TopBar'
// InputDrawer hidden for NL pivot — component preserved in codebase for future use
// import { InputDrawer } from '../components/InputDrawer'
import { ChatPanel } from '../components/ChatPanel'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { useClient, Client } from '../contexts/ClientContext'
import { useAuth } from '../contexts/AuthContext'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import { useInvestmentProfile } from '../contexts/InvestmentProfileContext'
import { useLayout } from '../contexts/LayoutContext'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { Building03Icon, TrendUp01Icon, BarChartSquare02Icon, Wallet02Icon } from '@/components/icons/PropertyIcons'
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
import { OwnedPropertyCard } from '../components/OwnedPropertyCard'
import { calculatePerPropertyProjection, type TimelinePropertyData } from '../utils/perPropertyProjections'
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

// Shared avatar constants
const AVATAR_BG = '#535862'
const AVATAR_TEXT_COLOR = '#FFFFFF'
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
  const location = useLocation()
  const routedPropertyInstanceId = (location.state as { propertyInstanceId?: string } | null)?.propertyInstanceId ?? null

  // Live context data — used to show unsaved plan data for active client
  const { propertyOrder: livePropertyOrder } = usePropertySelection()
  const { instances: liveInstances } = usePropertyInstance()
  const { profile: liveProfile } = useInvestmentProfile()
  const { timelineProperties: liveTimelineProperties } = useAffordabilityCalculator()

  // Use the global active client from ClientContext
  const activeClientId = globalActiveClient?.id || null
  const [drawerOpen, setDrawerOpen] = useState(true)
  const { chatPanelWidth } = useLayout()
  const [scenarioData, setScenarioData] = useState<Record<number, ClientScenarioData[]>>({})
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [purchaseStates, setPurchaseStates] = useState<Record<string, { isPurchased: boolean; address: string; photo: string }>>({})
  const [portfolioFilter, setPortfolioFilter] = useState<'all' | 'owned' | 'planned'>('all')
  const [selectedPropertyTab, setSelectedPropertyTab] = useState<string | null>(null)
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

  // Build live scenario from React contexts for the active client
  // This ensures the Portfolio shows current plan data without requiring a save first
  const liveScenario = useMemo((): ClientScenarioData | null => {
    if (!activeClientId || livePropertyOrder.length === 0) return null

    const feasibleTimeline = liveTimelineProperties.filter(
      (tp) => tp.status === 'feasible' && tp.affordableYear !== Infinity
    )

    const properties: PortfolioProperty[] = livePropertyOrder.map((instanceId, idx) => {
      const instance = liveInstances[instanceId] || {} as any
      const timelineItem = feasibleTimeline.find((tp) => tp.instanceId === instanceId)

      const purchasePrice = instance.purchasePrice || timelineItem?.cost || 0
      const rentPerWeek = instance.rentPerWeek || 0
      const lvr = instance.lvr || 80
      const loanAmount = timelineItem?.loanAmount || purchasePrice * (lvr / 100)
      const deposit = timelineItem?.depositRequired || purchasePrice * ((100 - lvr) / 100)
      const interestRate = instance.interestRate || 6.5
      const annualInterest = loanAmount * (interestRate / 100)
      const annualRent = rentPerWeek * 52
      const grossYield = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0
      const growthRate = instance.growthAssumption === 'High' ? 7 : instance.growthAssumption === 'Low' ? 4 : 5.5
      const affordableYear = timelineItem ? Math.round(timelineItem.affordableYear) : 2025 + idx + 1
      const yearsHeld = Math.max(0, new Date().getFullYear() - affordableYear)
      const estimatedValue = purchasePrice * Math.pow(1 + growthRate / 100, yearsHeld)
      const equity = estimatedValue - loanAmount
      const annualExpenses = annualInterest + (purchasePrice * 0.005)
      const netCashflow = annualRent - annualExpenses
      const growthSincePurchase = purchasePrice > 0 ? ((estimatedValue - purchasePrice) / purchasePrice) * 100 : 0
      const projectedEquity10Y = (purchasePrice * Math.pow(1 + growthRate / 100, 10)) - loanAmount

      // Determine title from template or instance
      const propTypeMatch = instanceId.match(/^(property_\d+)_instance_\d+$/)
      const propTypeId = propTypeMatch ? propTypeMatch[1] : instanceId
      const propIndex = propTypeId.match(/property_(\d+)/)
      const templateIndex = propIndex ? parseInt(propIndex[1], 10) : -1
      const template = templateIndex >= 0 ? propertyTypeTemplates[templateIndex] : null
      const title = timelineItem?.title || (template ? template.propertyType : (instance as any).title || `Property ${idx + 1}`)

      // Build raw timeline item for projection engine
      const rawTimelineItem: TimelinePropertyData | null = timelineItem ? {
        title: timelineItem.title,
        cost: timelineItem.cost,
        loanAmount: timelineItem.loanAmount,
        depositRequired: timelineItem.depositRequired,
        period: timelineItem.period,
        affordableYear: timelineItem.affordableYear,
        displayPeriod: timelineItem.displayPeriod,
        loanType: timelineItem.loanType || instance.loanProduct || 'IO',
      } : null

      // Build raw property instance
      const hasFullInstance = instance.rentPerWeek !== undefined && instance.interestRate !== undefined
      const rawPropertyInstance: PropertyInstanceDetails | null = hasFullInstance ? instance : null

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
        isPurchased: false,
        purchaseAddress: '',
        purchasePhoto: '',
        deposit,
        projectedEquity10Y,
        growthSincePurchase,
        propertyTypeKey: title,
        rawPropertyInstance,
        rawTimelineItem,
      } as PortfolioProperty
    })

    if (properties.length === 0) return null

    const scenarioGrowthCurve: GrowthCurve | null = liveProfile.growthCurve || null

    return {
      scenarioId: -1, // Sentinel for live/unsaved scenario
      scenarioName: 'Current Plan',
      properties,
      growthCurve: scenarioGrowthCurve,
    }
  }, [activeClientId, livePropertyOrder, liveInstances, liveTimelineProperties, liveProfile, propertyTypeTemplates])

  // Merge live scenario with saved scenarios — live data takes priority for active client
  const activeScenarios = useMemo(() => {
    const saved = activeClientId ? scenarioData[activeClientId] || [] : []
    if (!liveScenario) return saved
    // If there's a saved scenario, replace it with live data; otherwise add the live scenario
    if (saved.length > 0) {
      return [{ ...liveScenario, scenarioId: saved[0].scenarioId, scenarioName: saved[0].scenarioName }, ...saved.slice(1)]
    }
    return [liveScenario]
  }, [activeClientId, scenarioData, liveScenario])

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
    <div className="main-app flex h-screen w-full bg-white">
      <LeftRail />
      {/* NL Chat Panel — replaces InputDrawer */}
      <ChatPanel isOpen={drawerOpen} />

      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
        style={{ marginLeft: drawerOpen ? 64 + chatPanelWidth : 64 }}
      >
        <TopBar />

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col mx-auto" style={{ padding: '40px 0 80px 0', width: '80%', maxWidth: 1280, minWidth: 500 }}>
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
                {/* Summary stat cards */}
                {portfolioSummary && (
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-[#E9EAEB] p-5">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium text-[#535862]">Properties</span>
                        <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                          <Building03Icon size={18} color="#535862" />
                        </div>
                      </div>
                      <div className="mt-1">
                        <span className="text-[28px] font-semibold text-[#181D27] tracking-tight leading-tight">{portfolioSummary.totalProperties}</span>
                      </div>
                      <span className="text-xs text-[#717680] mt-0.5 block">{portfolioSummary.purchasedCount}/{portfolioSummary.totalProperties} owned</span>
                    </div>
                    <div className="bg-white rounded-xl border border-[#E9EAEB] p-5">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium text-[#535862]">Combined Value</span>
                        <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                          <TrendUp01Icon size={18} color="#535862" />
                        </div>
                      </div>
                      <div className="mt-1">
                        <span className="text-[28px] font-semibold text-[#181D27] tracking-tight leading-tight">{formatCurrency(portfolioSummary.combinedValue)}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-[#E9EAEB] p-5">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium text-[#535862]">Total Equity (now)</span>
                        <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                          <BarChartSquare02Icon size={18} color="#535862" />
                        </div>
                      </div>
                      <div className="mt-1">
                        <span className="text-[28px] font-semibold text-[#181D27] tracking-tight leading-tight">{formatCurrency(portfolioSummary.totalEquity)}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-[#E9EAEB] p-5">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium text-[#535862]">Annual Cashflow</span>
                        <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                          <Wallet02Icon size={18} color="#535862" />
                        </div>
                      </div>
                      <div className="mt-1">
                        <span className="text-[28px] font-semibold text-[#181D27] tracking-tight leading-tight">
                          {formatCurrency(portfolioSummary.totalCashflow)}/yr
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter removed — ownership count shown in Properties KPI card */}

                {/* Property cards — tabbed view */}
                {activeScenarios.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                    <Home size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="body-secondary">No scenarios found for this client</p>
                    <p className="meta mt-1">Create a scenario in the Dashboard first</p>
                  </div>
                ) : (() => {
                  // Build all property cards
                  const allCards = activeScenarios.flatMap(scenario =>
                    scenario.properties.map(property => {
                      const key = `${scenario.scenarioId}_${property.instanceId}`
                      const trackingState = purchaseStates[key]
                      const isPurchased = trackingState?.isPurchased || false
                      return { scenario, property, key, trackingState, isPurchased }
                    })
                  )

                  // Filter by portfolio filter
                  const filteredCards = portfolioFilter === 'all'
                    ? allCards
                    : portfolioFilter === 'owned'
                      ? allCards.filter(c => c.isPurchased)
                      : allCards.filter(c => !c.isPurchased)

                  if (filteredCards.length === 0) {
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                        <Home size={48} className="text-gray-300 mx-auto mb-4" />
                        <p className="body-secondary">No {portfolioFilter === 'owned' ? 'owned' : 'planned'} properties</p>
                      </div>
                    )
                  }

                  // Auto-select first tab if none selected or selection not in filtered list.
                  // If the user navigated in from a dashboard icon with a property instanceId,
                  // prefer the matching card (unless the user has already picked a different tab).
                  const routedCard = routedPropertyInstanceId
                    ? filteredCards.find(c => c.property.instanceId === routedPropertyInstanceId)
                    : undefined
                  const activeTab = filteredCards.find(c => c.key === selectedPropertyTab)
                    ? selectedPropertyTab
                    : (routedCard?.key ?? filteredCards[0]?.key)
                  const activeCard = filteredCards.find(c => c.key === activeTab)

                  return (
                    <div>
                      {/* Tab bar wrapped in card-like container */}
                      <div className="rounded-xl border border-[#E9EAEB] overflow-hidden">
                        <div className="bg-[#FCFCFD] px-6 py-3.5 border-b border-[#E9EAEB]">
                          <div className="flex items-center gap-1 flex-wrap">
                            {filteredCards.map(({ property, key, trackingState, isPurchased, scenario }) => {
                              const isActive = key === activeTab
                              const label = isPurchased && trackingState?.address ? trackingState.address : property.title
                              return (
                                <button
                                  key={key}
                                  onClick={() => setSelectedPropertyTab(key)}
                                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-md transition-colors ${
                                    isActive
                                      ? 'bg-white text-[#181D27] border border-[#E9EAEB] shadow-sm'
                                      : 'text-[#535862] hover:text-[#181D27] hover:bg-white/60'
                                  }`}
                                >
                                  <span className="truncate max-w-[160px]">{label}</span>
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPurchased ? 'bg-green-500' : 'bg-[#A4A7AE]'}`} />
                                  {/* Inline toggle */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleActivateProperty(scenario.scenarioId, property) }}
                                    className={`w-7 h-4 rounded-full transition-colors flex-shrink-0 ${isPurchased ? 'bg-green-500' : 'bg-[#D5D7DA]'}`}
                                    title={isPurchased ? 'Mark as not purchased' : 'Mark as purchased'}
                                  >
                                    <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${isPurchased ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                  </button>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Active tab content — inside the card container */}
                        <div className="bg-white p-6">
                        {activeCard && (() => {
                          const { scenario, property, key, trackingState, isPurchased } = activeCard
                          const propertyImage = getPortfolioPropertyImage(property.propertyTypeKey || property.title)

                          if (!isPurchased) {
                            // Unpurchased empty state
                            return (
                              <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
                                <div className="w-20 h-20 mb-4 opacity-30">
                                  {propertyImage ? (
                                    <img src={propertyImage} alt={property.title} className="w-full h-full object-contain" />
                                  ) : (
                                    <Home size={40} className="text-[#A4A7AE] mx-auto mt-3" />
                                  )}
                                </div>
                                <h4 className="text-sm font-semibold text-[#181D27] mb-1">{property.title}</h4>
                                <p className="text-xs text-[#717680] mb-1">{property.state} · {formatCurrency(property.purchasePrice)} · {property.growthAssumption} Growth</p>
                                <p className="text-xs text-[#717680] mb-4">
                                  Est. Cashflow: <span className="text-[#181D27] font-medium">{formatCurrency(property.netCashflow)}/yr</span>
                                  {' · '}Proj. Equity (10Y): <span className="text-[#181D27] font-medium">{formatCurrency(property.projectedEquity10Y)}</span>
                                </p>
                                <p className="text-xs text-[#535862]">Toggle to purchased to view detailed projections</p>
                              </div>
                            )
                          }

                          // Purchased — render full OwnedPropertyCard
                          const scenarioDataItem = activeScenarios.find(s => s.scenarioId === scenario.scenarioId)
                          const defaultGrowthCurve: GrowthCurve = { year1: 12.5, years2to3: 10, year4: 7.5, year5plus: 6 }
                          const growthCurve = scenarioDataItem?.growthCurve || defaultGrowthCurve

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

                          return (
                            <OwnedPropertyCard
                              key={key}
                              property={property}
                              projection={projection}
                              propInstance={propInstance}
                              timelineData={timelineData}
                              trackingState={trackingState}
                              propertyImage={propertyImage}
                            />
                          )
                        })()}
                        </div>
                      </div>
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
                      <div className="relative w-full max-w-lg bg-[#FAFAFA] h-full overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
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
