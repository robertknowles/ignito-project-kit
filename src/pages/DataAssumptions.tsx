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
  Eye,
} from 'lucide-react'
import { LeftRail } from '../components/LeftRail'
import { LibraryDrawer } from '../components/LibraryDrawer'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useClient, Client } from '../contexts/ClientContext'
import { translateLegacyEngineId, isCellId, getCellDisplayLabel, type CellId } from '../utils/propertyCells'
import { BASE_YEAR } from '../constants/financialParams'
import { useAuth } from '../contexts/AuthContext'
import { PropertyDetailModal } from '../components/PropertyDetailModal'
import { TitleDeedCard } from '../components/TitleDeedCard'
import { CustomBlockModal } from '../components/CustomBlockModal'
import type { CustomPropertyBlock } from '../components/CustomBlockModal'
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
}

interface ClientScenarioData {
  scenarioId: number
  scenarioName: string
  properties: PortfolioProperty[]
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

// Property images mapping — matches TitleDeedCard.tsx
const PORTFOLIO_PROPERTY_IMAGES: Record<string, string> = {
  'Metro Houses': '/images/properties/metro-house.png',
  'Units / Apartments': '/images/properties/units-apartments.png',
  'Villas / Townhouses': '/images/properties/townhouses.png',
  'Houses (Regional)': '/images/properties/regional-house.png',
  'Duplexes': '/images/properties/duplex.png',
  'Small Blocks (3-4 Units)': '/images/properties/smaller-blocks-3-4.png',
  'Larger Blocks (10-20 Units)': '/images/properties/larger-blocks-10-20.png',
  'Commercial Property': '/images/properties/commercial-property.png',
  // v4 cell display labels — share existing image assets per cell type/mode pair.
  'Metro House — Growth': '/images/properties/metro-house.png',
  'Metro House — Cashflow': '/images/properties/metro-house.png',
  'Regional House — Growth': '/images/properties/regional-house.png',
  'Regional House — Cashflow': '/images/properties/regional-house.png',
  'Metro Unit — Growth': '/images/properties/townhouses.png',
  'Metro Unit — Cashflow': '/images/properties/units-apartments.png',
  'Regional Unit — Growth': '/images/properties/townhouses.png',
  'Regional Unit — Cashflow': '/images/properties/units-apartments.png',
  'Commercial — High Cost': '/images/properties/commercial-property.png',
  'Commercial — Low Cost': '/images/properties/commercial-property.png',
}

const getPortfolioPropertyImage = (title: string): string | undefined => {
  if (PORTFOLIO_PROPERTY_IMAGES[title]) return PORTFOLIO_PROPERTY_IMAGES[title]
  const normalize = (s: string) => s.toLowerCase().replace(' focus', '').trim()
  const key = Object.keys(PORTFOLIO_PROPERTY_IMAGES).find(k => normalize(k) === normalize(title))
  return key ? PORTFOLIO_PROPERTY_IMAGES[key] : undefined
}

export const DataAssumptions = () => {
  const { propertyTypeTemplates } = useDataAssumptions()
  const { customBlocks, removeCustomBlock, addCustomBlock } = usePropertySelection()
  const { clients } = useClient()
  const { companyId } = useAuth()

  // Library state
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [showCustomBlockModal, setShowCustomBlockModal] = useState(false)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [activeView, setActiveView] = useState<'library' | 'portfolio'>('library')
  const [activeClientId, setActiveClientId] = useState<number | null>(null)

  // Portfolio state
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

  const handleSaveCustomBlock = (block: CustomPropertyBlock) => {
    addCustomBlock(block)
  }

  // --- Portfolio Data Fetching ---
  useEffect(() => {
    if (activeView !== 'portfolio' || clients.length === 0) return

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

          // Helper to build a PortfolioProperty from instance data
          const buildProperty = (
            instanceId: string,
            title: string,
            instance: any,
            tracking: any,
            affordableYear: number,
            idx: number,
            cost?: number
          ) => {
            const purchasePrice = instance.purchasePrice || cost || 0
            const rentPerWeek = instance.rentPerWeek || 0
            const lvr = instance.lvr || 80
            const loanAmount = purchasePrice * (lvr / 100)
            const deposit = purchasePrice * ((100 - lvr) / 100)
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
            } as PortfolioProperty
          }

          // Check for feasible items in timelineSnapshot
          const feasibleSnapshot = timelineSnapshot && Array.isArray(timelineSnapshot)
            ? timelineSnapshot.filter((item: any) => item.status === 'feasible' && item.affordableYear !== Infinity)
            : []

          if (feasibleSnapshot.length > 0) {
            // PATH 1: Use timelineSnapshot (most accurate — has calculated years/costs)
            feasibleSnapshot
              .sort((a: any, b: any) => (a.affordableYear || 0) - (b.affordableYear || 0))
              .forEach((item: any, idx: number) => {
                const instanceId = item.instanceId || item.id || `prop_${idx}`
                const instance = propertyInstances[instanceId] || {}
                const tracking = portfolioTracking[instanceId] || {}
                const cellPart = instanceId.split('_instance_')[0]
                const fallbackTitle = isCellId(cellPart) ? getCellDisplayLabel(cellPart as CellId) : `Property ${idx + 1}`
                const prop = buildProperty(instanceId, item.title || fallbackTitle, instance, tracking, Math.round(item.affordableYear || BASE_YEAR), idx, item.cost)
                properties.push(prop)
                purchaseMap[`${scenario.id}_${instanceId}`] = {
                  isPurchased: tracking.isPurchased || false,
                  address: tracking.address || '',
                  photo: tracking.photo || '',
                }
              })
          } else if (propertyOrder.length > 0 || Object.keys(propertySelections).length > 0) {
            // PATH 2: Fallback — use propertyOrder + propertyInstances + propertySelections
            // Build instance list from propertyOrder, or reconstruct from propertySelections
            let instanceIds: string[] = propertyOrder.length > 0
              ? propertyOrder
              : []

            // If no propertyOrder, reconstruct from propertySelections
            if (instanceIds.length === 0) {
              Object.entries(propertySelections).forEach(([propId, qty]) => {
                const count = qty as number
                for (let i = 0; i < count; i++) {
                  instanceIds.push(`${propId}_instance_${i}`)
                }
              })
            }

            const baseYear = BASE_YEAR
            const profile = sd.investmentProfile || {}
            const annualSavings = profile.annualSavings || 50000

            instanceIds.forEach((instanceId: string, idx: number) => {
              const instance = propertyInstances[instanceId] || {}
              const tracking = portfolioTracking[instanceId] || {}

              // Extract property type from instance ID. Supports both legacy positional
              // form ("property_0_instance_0") and v4 cell-ID form ("metro-house-growth_instance_0").
              const propTypeMatch = instanceId.match(/^(.+)_instance_\d+$/)
              const propTypeId = propTypeMatch ? propTypeMatch[1] : instanceId

              // Resolve type ID → template via cellId, with legacy positional fallback.
              let template = propertyTypeTemplates.find((t) => t.cellId === propTypeId) ?? null
              if (!template) {
                const translatedCellId = translateLegacyEngineId(propTypeId)
                if (translatedCellId) {
                  template = propertyTypeTemplates.find((t) => t.cellId === translatedCellId) ?? null
                }
              }
              if (!template) {
                const propIndex = propTypeId.match(/property_(\d+)/)
                const templateIndex = propIndex ? parseInt(propIndex[1], 10) : -1
                template = templateIndex >= 0 ? propertyTypeTemplates[templateIndex] : null
              }
              const title = template ? template.propertyType : instance.title || `Property ${idx + 1}`

              // Estimate purchase year based on position
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
          })
        })

        setScenarioData(dataMap)
        setPurchaseStates(prev => ({ ...prev, ...purchaseMap }))

        // Auto-select first client with data
        if (!activeClientId) {
          const firstClient = clients.find(c => dataMap[c.id]?.some(s => s.properties.length > 0))
          if (firstClient) setActiveClientId(firstClient.id)
        }
      } catch {
        // Silently fail
      }
      setPortfolioLoading(false)
    }

    fetchScenarios()
  }, [activeView, clients])

  // Drawer client list
  const drawerClients = useMemo(() => {
    return clients.map(c => {
      const scenarios = scenarioData[c.id] || []
      const allProps = scenarios.flatMap(s => s.properties)
      const purchasedCount = allProps.filter(p => {
        const scenarioId = scenarios.find(s => s.properties.includes(p))?.scenarioId
        const key = `${scenarioId}_${p.instanceId}`
        return purchaseStates[key]?.isPurchased
      }).length
      return {
        id: c.id,
        name: c.name,
        propertyCount: allProps.length,
        purchasedCount,
      }
    })
  }, [clients, scenarioData, purchaseStates])

  // Active client data
  const activeClient = clients.find(c => c.id === activeClientId)
  const activeScenarios = activeClientId ? scenarioData[activeClientId] || [] : []

  // Portfolio summary — includes ALL properties (owned + planned)
  const portfolioSummary = useMemo(() => {
    if (!activeClientId) return null
    const allProps = activeScenarios.flatMap(s =>
      s.properties.map(p => ({ ...p, key: `${s.scenarioId}_${p.instanceId}` }))
    )
    const purchased = allProps.filter(p => purchaseStates[p.key]?.isPurchased)
    const planned = allProps.filter(p => !purchaseStates[p.key]?.isPurchased)
    // Combined value: owned at estimated value, planned at purchase price
    const combinedValue = purchased.reduce((sum, p) => sum + p.estimatedValue, 0)
      + planned.reduce((sum, p) => sum + p.purchasePrice, 0)
    // Equity: owned actual equity + planned projected equity at purchase
    const totalEquity = purchased.reduce((sum, p) => sum + p.equity, 0)
    // Cashflow: all properties
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
      // Turn off
      setPurchaseStates(prev => ({ ...prev, [key]: { ...prev[key], isPurchased: false } }))
      savePortfolioTracking(scenarioId, property.instanceId, false, current.address, current.photo)
      toast.success(`${property.title} marked as not yet purchased`)
    } else {
      // Turn on — show modal
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

  // Handle view change — auto-select first client when entering portfolio
  const handleViewChange = (view: 'library' | 'portfolio') => {
    setActiveView(view)
    if (view === 'portfolio' && !activeClientId && drawerClients.length > 0) {
      setActiveClientId(drawerClients[0].id)
    }
  }

  return (
    <div className="main-app flex h-screen w-full bg-[#f9fafb]">
      <LeftRail />
      <LibraryDrawer
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen(o => !o)}
        activeView={activeView}
        onViewChange={handleViewChange}
        clients={drawerClients}
        activeClientId={activeClientId}
        onSelectClient={setActiveClientId}
      />
      <div className={`flex-1 overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
        drawerOpen ? 'ml-[calc(4rem+14rem)]' : 'ml-16'
      }`}>
        <div className="flex-1 overflow-auto">
          <div className="p-8">

            {/* ========== PROPERTY LIBRARY VIEW ========== */}
            {activeView === 'library' && (
              <>
                <div className="mb-8">
                  <h1 className="page-title">Property Library</h1>
                  <p className="body-secondary mt-2">
                    Set default values for each property type. When you add a property to the timeline,
                    it will inherit these defaults. You can still customize individual properties.
                  </p>
                </div>

                {/* Add Custom Block Button */}
                <button
                  onClick={() => setShowCustomBlockModal(true)}
                  className="w-full mb-6 py-4 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Custom Property Block
                </button>

                {/* Property Type Templates */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {propertyTypeTemplates.map((template) => (
                    <TitleDeedCard
                      key={template.propertyType}
                      template={template}
                      onEdit={() => setEditingTemplate(template.propertyType)}
                    />
                  ))}
                </div>

                {/* Custom Property Blocks */}
                {customBlocks.length > 0 && (
                  <div className="border-t border-[#e5e7eb] mt-8 pt-8">
                    <h2 className="section-heading mb-4">Custom Property Blocks</h2>
                    <p className="body-secondary mb-4">
                      These are custom property types you've created. They use simplified settings.
                    </p>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="table-header text-left">Property Name</th>
                            <th className="table-header text-left">Price</th>
                            <th className="table-header text-left">Yield %</th>
                            <th className="table-header text-left">Growth %</th>
                            <th className="table-header text-left">LVR %</th>
                            <th className="table-header text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customBlocks.map((block) => (
                            <tr key={block.id} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                              <td className="table-cell">{block.title}</td>
                              <td className="table-cell">${block.cost.toLocaleString()}</td>
                              <td className="table-cell">{block.yieldPercent}%</td>
                              <td className="table-cell">{block.growthPercent}%</td>
                              <td className="table-cell">{block.lvr}%</td>
                              <td className="table-cell">
                                <button
                                  onClick={() => removeCustomBlock(block.id)}
                                  className="text-red-500 hover:text-red-700 text-sm transition-colors"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ========== CLIENT PORTFOLIO VIEW ========== */}
            {activeView === 'portfolio' && (
              <>
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
                        : 'Select a client from the sidebar to view their portfolio.'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Page header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h1 className="page-title">Portfolio</h1>
                        <p className="body-secondary mt-1">
                          {activeClient.name}'s real properties and planned purchases — everything in one place.
                        </p>
                      </div>
                    </div>

                    {/* Summary stat cards — always visible */}
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

                    {/* Property cards grid */}
                    {activeScenarios.length === 0 ? (
                      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                        <Home size={48} className="text-gray-300 mx-auto mb-4" />
                        <p className="body-secondary">No scenarios found for this client</p>
                        <p className="meta mt-1">Create a scenario in the Dashboard first</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {activeScenarios.flatMap(scenario =>
                          scenario.properties.map(property => {
                            const key = `${scenario.scenarioId}_${property.instanceId}`
                            const trackingState = purchaseStates[key]
                            const isPurchased = trackingState?.isPurchased || false

                            // Apply filter
                            if (portfolioFilter === 'owned' && !isPurchased) return null
                            if (portfolioFilter === 'planned' && isPurchased) return null

                            const propertyImage = getPortfolioPropertyImage(property.propertyTypeKey || property.title)

                            if (isPurchased) {
                              // ===== OWNED CARD =====
                              return (
                                <div
                                  key={`${scenario.scenarioId}_${property.instanceId}`}
                                  className="flex flex-col rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition-colors"
                                >
                                  {/* Image area with badges */}
                                  <div className="relative h-40 bg-gray-100 overflow-hidden">
                                    {trackingState?.photo ? (
                                      <img
                                        src={trackingState.photo}
                                        alt={property.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                      />
                                    ) : propertyImage ? (
                                      <img src={propertyImage} alt={property.title} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                        <Home size={32} className="text-gray-300" />
                                      </div>
                                    )}
                                    {/* OWNED badge */}
                                    <span className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded">
                                      Owned
                                    </span>
                                    {/* Growth badge */}
                                    {property.growthSincePurchase > 0 && (
                                      <span className="absolute top-3 right-3 bg-green-50 text-green-700 border border-green-200 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                        +{Math.round(property.growthSincePurchase)}% growth
                                      </span>
                                    )}
                                  </div>

                                  {/* Content area */}
                                  <div className="bg-white px-4 py-3">
                                    <div className="flex items-start justify-between">
                                      <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                                          {trackingState?.address || property.title}
                                        </h4>
                                        {trackingState?.address && (
                                          <p className="text-[10px] font-medium text-gray-500 mt-0.5">
                                            {property.state}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleActivateProperty(scenario.scenarioId, property) }}
                                        className="w-8 h-4 rounded-full bg-green-500 transition-colors flex-shrink-0 ml-2 relative"
                                        title="Mark as not purchased"
                                      >
                                        <div className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform translate-x-4" />
                                      </button>
                                    </div>

                                    {/* 2×2 metrics grid */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-100">
                                      <div>
                                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Current Value</div>
                                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(property.estimatedValue)}</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Total Equity</div>
                                        <div className="text-sm font-semibold text-green-600">{formatCurrency(property.equity)}</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">LVR</div>
                                        <div className="text-sm font-semibold text-gray-900">{property.lvr}%</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Cashflow</div>
                                        <div className={`text-sm font-semibold ${property.netCashflow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                          {property.netCashflow >= 0 ? '+' : ''}{formatCurrency(property.netCashflow)}/yr
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Footer */}
                                  <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">
                                      Purchased {property.affordableYear}
                                    </span>
                                    <button
                                      onClick={() => setDetailProperty({ property, scenarioId: scenario.scenarioId })}
                                      className="text-[10px] font-medium hover:underline"
                                      style={{ color: '#4A7BF7' }}
                                    >
                                      View details →
                                    </button>
                                  </div>
                                </div>
                              )
                            } else {
                              // ===== PLANNED CARD =====
                              return (
                                <div
                                  key={`${scenario.scenarioId}_${property.instanceId}`}
                                  className="flex flex-col rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition-colors"
                                >
                                  {/* Image area with property type illustration */}
                                  <div className="relative h-40 bg-[#f0f4f8] overflow-hidden flex items-center justify-center">
                                    {propertyImage ? (
                                      <img
                                        src={propertyImage}
                                        alt={property.title}
                                        className="h-28 object-contain opacity-60"
                                      />
                                    ) : (
                                      <Home size={40} className="text-gray-300" />
                                    )}
                                    {/* PLANNED badge */}
                                    <span className="absolute top-3 left-3 bg-[#374151] text-white text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded">
                                      Planned
                                    </span>
                                    {/* Buy year badge */}
                                    <span className="absolute top-3 right-3 bg-white border border-gray-200 text-[#374151] text-[10px] font-medium px-2 py-0.5 rounded-full">
                                      Buy {property.affordableYear}
                                    </span>
                                  </div>

                                  {/* Content area */}
                                  <div className="bg-white px-4 py-3">
                                    <div className="flex items-start justify-between">
                                      <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-semibold text-gray-900 truncate">{property.title}</h4>
                                        <p className="text-[10px] font-medium text-gray-500 mt-0.5">
                                          Template · {property.growthAssumption} Growth Zone
                                        </p>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleActivateProperty(scenario.scenarioId, property) }}
                                        className="w-8 h-4 rounded-full bg-gray-300 transition-colors flex-shrink-0 ml-2 mt-0.5 relative"
                                        title="Mark as purchased"
                                      >
                                        <div className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform translate-x-0.5" />
                                      </button>
                                    </div>

                                    {/* 2×2 metrics grid */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-100">
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
                                        <div className={`text-sm font-semibold ${property.netCashflow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                          {property.netCashflow >= 0 ? '+' : ''}{formatCurrency(property.netCashflow)}/yr
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Proj. Equity (10Y)</div>
                                        <div className="text-sm font-semibold text-green-600">{formatCurrency(property.projectedEquity10Y)}</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Footer */}
                                  <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">From Property Library</span>
                                    <button
                                      onClick={() => setDetailProperty({ property, scenarioId: scenario.scenarioId })}
                                      className="text-[10px] font-medium hover:underline"
                                      style={{ color: '#4A7BF7' }}
                                    >
                                      Customise →
                                    </button>
                                  </div>
                                </div>
                              )
                            }
                          })
                        ).filter(Boolean)}

                        {/* Add planned property card */}
                        <button
                          onClick={() => {
                            setActiveView('library')
                          }}
                          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 h-[340px] hover:border-gray-400 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                            <Plus size={20} className="text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-500 font-medium">Add planned property</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">From Property Library</span>
                        </button>
                      </div>
                    )}

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
                          <div
                            className="relative w-full max-w-lg bg-[#f9fafb] h-full overflow-auto shadow-xl"
                            onClick={e => e.stopPropagation()}
                          >
                            {/* Hero */}
                            <div className="relative h-48 bg-gray-200 overflow-hidden">
                              {dIsPurchased && dTracking?.photo ? (
                                <img src={dTracking.photo} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#f0f4f8] flex items-center justify-center">
                                  {(() => {
                                    const img = getPortfolioPropertyImage(dp.propertyTypeKey || dp.title)
                                    return img
                                      ? <img src={img} alt="" className="h-32 object-contain opacity-60" />
                                      : <Home size={48} className="text-gray-300" />
                                  })()}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                              <div className="absolute bottom-4 left-4 text-white">
                                <h3 className="text-lg font-semibold">
                                  {dIsPurchased && dTracking?.address ? dTracking.address : dp.title}
                                </h3>
                                <p className="text-xs text-white/80">{dp.state}</p>
                              </div>
                              <button
                                onClick={() => setDetailProperty(null)}
                                className="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                              >
                                ✕
                              </button>
                              <div className="absolute top-3 left-3">
                                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded ${
                                  dIsPurchased ? 'bg-green-500 text-white' : 'bg-[#374151] text-white'
                                }`}>
                                  {dIsPurchased ? 'Owned' : 'Planned'}
                                </span>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white">
                              <button
                                onClick={() => handleActivateProperty(detailProperty.scenarioId, dp)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                                  dIsPurchased
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : 'border-green-200 text-green-700 hover:bg-green-50'
                                }`}
                              >
                                {dIsPurchased ? 'Mark as Not Purchased' : 'Mark as Purchased'}
                              </button>
                            </div>

                            <div className="p-6 space-y-5">
                              {/* Property Details */}
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

                              {/* Loan Details */}
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

                              {/* Rental Details */}
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

                              {/* Financial Summary */}
                              <div>
                                <h4 className="section-heading mb-3">Financial Summary</h4>
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                                  {[
                                    { label: 'Purchase Price', value: formatCurrency(dp.purchasePrice) },
                                    { label: 'Current Value', value: formatCurrency(dp.estimatedValue) },
                                    ...(dIsPurchased && dp.growthSincePurchase > 0
                                      ? [{ label: 'Growth Since Purchase', value: `${dp.growthSincePurchase.toFixed(1)}%`, color: 'text-green-600' }]
                                      : []),
                                    ...(dIsPurchased && compoundGrowthPA > 0
                                      ? [{ label: 'Compound Growth Rate PA', value: `${compoundGrowthPA.toFixed(1)}%` }]
                                      : []),
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
              </>
            )}

          </div>
        </div>
      </div>

      {/* Property Detail Modal */}
      {editingTemplate && (
        <PropertyDetailModal
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          instanceId={`template_${editingTemplate}`}
          propertyType={editingTemplate}
          isTemplate={true}
        />
      )}

      {/* Custom Block Modal */}
      <CustomBlockModal
        isOpen={showCustomBlockModal}
        onClose={() => setShowCustomBlockModal(false)}
        onSave={handleSaveCustomBlock}
      />

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
              <Input
                id="purchase-address"
                value={activateAddress}
                onChange={(e) => setActivateAddress(e.target.value)}
                placeholder="e.g. 42 Smith Street, Richmond VIC 3121"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="purchase-photo">
                <div className="flex items-center gap-1.5">
                  <Camera size={14} className="text-gray-400" />
                  Property Photo URL
                </div>
              </Label>
              <Input
                id="purchase-photo"
                value={activatePhoto}
                onChange={(e) => setActivatePhoto(e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
              {activatePhoto && (
                <div className="mt-1 h-24 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                  <img
                    src={activatePhoto}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setActivateModalOpen(false)
              setActivatingProperty(null)
              setActivatingScenarioId(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmActivate}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin mr-1.5" />Saving...</>
              ) : (
                <><CheckCircle2 size={14} className="mr-1.5" />Mark as Purchased</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
