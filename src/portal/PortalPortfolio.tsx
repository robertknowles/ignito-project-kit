import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useBranding } from '@/contexts/BrandingContext'
import { usePortalClient } from '@/hooks/usePortalClient'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { PlusIcon, Edit2, Trash2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { fetchPropertyImage } from '@/utils/propertyImage'
import type { AddressSelection } from '@/hooks/useAddressSearch'

interface ClientProperty {
  id: number
  client_id: number
  company_id: string | null
  address: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  property_type: string | null
  purchase_price: number | null
  purchase_date: string | null
  current_value: number | null
  loan_balance: number | null
  rental_income_weekly: number | null
  tenanted_until: string | null
  notes: string | null
  photo_url: string | null
  latitude: number | null
  longitude: number | null
  place_id: string | null
}

const EMPTY_FORM: Omit<ClientProperty, 'id' | 'client_id' | 'company_id'> = {
  address: '',
  suburb: '',
  state: '',
  postcode: '',
  property_type: 'House',
  purchase_price: null,
  purchase_date: '',
  current_value: null,
  loan_balance: null,
  rental_income_weekly: null,
  tenanted_until: '',
  notes: '',
  photo_url: null,
  latitude: null,
  longitude: null,
  place_id: null,
}

const PROPERTY_TYPES = ['House', 'Unit/Apartment', 'Townhouse', 'Land', 'Villa', 'Duplex']
const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

export const PortalPortfolio = () => {
  const { branding } = useBranding()
  const { client, loading } = usePortalClient()
  const [properties, setProperties] = useState<ClientProperty[]>([])
  const [propsLoading, setPropsLoading] = useState(true)

  // Modal state
  const [formOpen, setFormOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<ClientProperty | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ClientProperty | null>(null)

  // Fetch properties
  useEffect(() => {
    const fetch = async () => {
      if (!client) {
        setPropsLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('client_properties')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })

        if (!error && data) {
          setProperties(data as ClientProperty[])
        }
      } catch {
        // Fetch failed
      }
      setPropsLoading(false)
    }
    fetch()
  }, [client?.id])

  // Summary stats
  const stats = useMemo(() => {
    const totalValue = properties.reduce((s, p) => s + (p.current_value || 0), 0)
    const totalLoans = properties.reduce((s, p) => s + (p.loan_balance || 0), 0)
    const weeklyRent = properties.reduce((s, p) => s + (p.rental_income_weekly || 0), 0)
    return {
      totalValue: totalValue > 0 ? totalValue : null,
      totalEquity: totalValue > 0 ? totalValue - totalLoans : null,
      totalLoans: totalLoans > 0 ? totalLoans : null,
      weeklyRent: weeklyRent > 0 ? weeklyRent : null,
    }
  }, [properties])

  const formatCurrency = (val: number | null) => {
    if (val == null) return '--'
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(val)
  }

  // LVR calculation
  const getLVR = (property: ClientProperty) => {
    if (!property.current_value || !property.loan_balance) return null
    return Math.round((property.loan_balance / property.current_value) * 100)
  }

  // Open add modal
  const openAddModal = () => {
    setEditingProperty(null)
    setFormData({ ...EMPTY_FORM })
    setFormOpen(true)
  }

  // Open edit modal
  const openEditModal = (property: ClientProperty) => {
    setEditingProperty(property)
    setFormData({
      address: property.address || '',
      suburb: property.suburb || '',
      state: property.state || '',
      postcode: property.postcode || '',
      property_type: property.property_type || 'House',
      purchase_price: property.purchase_price,
      purchase_date: property.purchase_date ? property.purchase_date.split('T')[0] : '',
      current_value: property.current_value,
      loan_balance: property.loan_balance,
      rental_income_weekly: property.rental_income_weekly,
      tenanted_until: property.tenanted_until ? property.tenanted_until.split('T')[0] : '',
      notes: property.notes || '',
      photo_url: property.photo_url,
      latitude: property.latitude,
      longitude: property.longitude,
      place_id: property.place_id,
    })
    setFormOpen(true)
  }

  // Save property
  const handleSave = async () => {
    if (!client) return
    setSaving(true)

    try {
      const payload = {
        client_id: client.id,
        company_id: client.company_id || null,
        address: formData.address || null,
        suburb: formData.suburb || null,
        state: formData.state || null,
        postcode: formData.postcode || null,
        property_type: formData.property_type || null,
        purchase_price: formData.purchase_price,
        purchase_date: formData.purchase_date || null,
        current_value: formData.current_value,
        loan_balance: formData.loan_balance,
        rental_income_weekly: formData.rental_income_weekly,
        tenanted_until: formData.tenanted_until || null,
        notes: formData.notes || null,
        photo_url: formData.photo_url,
        latitude: formData.latitude,
        longitude: formData.longitude,
        place_id: formData.place_id,
      }

      if (editingProperty) {
        // Update
        const { error } = await supabase
          .from('client_properties')
          .update(payload)
          .eq('id', editingProperty.id)

        if (error) throw error
        toast.success('Property updated!')
      } else {
        // Insert
        const { error } = await supabase
          .from('client_properties')
          .insert(payload)

        if (error) throw error
        toast.success('Property added!')
      }

      // Refresh
      const { data } = await supabase
        .from('client_properties')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })

      if (data) setProperties(data as ClientProperty[])

      setFormOpen(false)
      setEditingProperty(null)
    } catch {
      toast.error('Failed to save property')
    }
    setSaving(false)
  }

  // Delete property
  const handleDelete = async () => {
    if (!deleteTarget || !client) return

    try {
      const { error } = await supabase
        .from('client_properties')
        .delete()
        .eq('id', deleteTarget.id)

      if (error) throw error

      setProperties(prev => prev.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Property removed')
    } catch {
      toast.error('Failed to delete property')
    }
  }

  // Update form field
  const setField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // Address picked from autocomplete — fill the location fields and fetch a
  // Street View (or satellite fallback) photo in the background.
  const [fetchingPhoto, setFetchingPhoto] = useState(false)
  const photoFetchSeq = useRef(0)
  const handleAddressSelect = (sel: AddressSelection) => {
    setFormData(prev => ({
      ...prev,
      address: sel.streetLine,
      suburb: sel.suburb,
      state: sel.state || prev.state,
      postcode: sel.postcode,
      latitude: sel.latitude,
      longitude: sel.longitude,
      place_id: sel.placeId,
      photo_url: null,
    }))
    const seq = ++photoFetchSeq.current
    setFetchingPhoto(true)
    fetchPropertyImage(sel.latitude, sel.longitude, sel.placeId).then(result => {
      if (seq !== photoFetchSeq.current) return
      setFetchingPhoto(false)
      if (result) setFormData(prev => ({ ...prev, photo_url: result.url }))
    })
  }

  if (loading || propsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-500">Loading portfolio...</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Portfolio</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track your property investments
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
          style={{ backgroundColor: branding.primaryColor }}
        >
          <PlusIcon size={16} />
          Add property
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'TOTAL VALUE', value: formatCurrency(stats.totalValue) },
          { label: 'TOTAL EQUITY', value: formatCurrency(stats.totalEquity) },
          { label: 'TOTAL LOANS', value: formatCurrency(stats.totalLoans) },
          { label: 'WEEKLY RENT INCOME', value: formatCurrency(stats.weeklyRent) },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Properties list or empty state */}
      {properties.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${branding.primaryColor}15` }}
          >
            <span className="text-3xl">🏠</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            No properties yet
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
            Add your existing properties to track their value, equity, and rental
            income over time.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Add your first property
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map(property => {
            const lvr = getLVR(property)
            const displayAddress = [property.address, property.suburb, property.state, property.postcode]
              .filter(Boolean)
              .join(', ') || 'No address'

            return (
              <div
                key={property.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  {property.photo_url && (
                    <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 flex-shrink-0 mr-4">
                      <img
                        src={property.photo_url}
                        alt={displayAddress}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">{displayAddress}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {property.property_type && (
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                          {property.property_type}
                        </span>
                      )}
                      {property.purchase_date && (
                        <span className="text-xs text-gray-500">
                          Purchased {new Date(property.purchase_date).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(property)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(property)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Current Value</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(property.current_value)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Loan Balance</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(property.loan_balance)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Weekly Rent</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(property.rental_income_weekly)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">LVR</p>
                    {lvr != null ? (
                      <div className="mt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{lvr}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              lvr > 80 ? 'bg-red-500' : lvr > 60 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(lvr, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">--</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Property Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProperty ? 'Edit Property' : 'Add Property'}</DialogTitle>
            <DialogDescription>
              {editingProperty ? 'Update the details for this property.' : 'Enter the details for your property.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Address */}
            <div className="grid gap-2">
              <Label>Street address</Label>
              <AddressAutocomplete
                value={formData.address || ''}
                onInputChange={(v) => setField('address', v)}
                onSelect={handleAddressSelect}
                placeholder="123 Example Street"
              />
              {fetchingPhoto && (
                <p className="text-xs text-gray-400">Fetching Street View image…</p>
              )}
              {formData.photo_url && (
                <div className="h-24 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                  <img
                    src={formData.photo_url}
                    alt="Property"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Suburb</Label>
                <Input
                  value={formData.suburb || ''}
                  onChange={(e) => setField('suburb', e.target.value)}
                  placeholder="Suburb"
                />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <select
                  value={formData.state || ''}
                  onChange={(e) => setField('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {AU_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Postcode</Label>
                <Input
                  value={formData.postcode || ''}
                  onChange={(e) => setField('postcode', e.target.value)}
                  placeholder="2000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Property type</Label>
                <select
                  value={formData.property_type || ''}
                  onChange={(e) => setField('property_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {PROPERTY_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Purchase date</Label>
                <Input
                  type="date"
                  value={formData.purchase_date || ''}
                  onChange={(e) => setField('purchase_date', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Purchase price ($)</Label>
                <Input
                  type="number"
                  value={formData.purchase_price ?? ''}
                  onChange={(e) => setField('purchase_price', e.target.value ? Number(e.target.value) : null)}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label>Current value ($)</Label>
                <Input
                  type="number"
                  value={formData.current_value ?? ''}
                  onChange={(e) => setField('current_value', e.target.value ? Number(e.target.value) : null)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Loan balance ($)</Label>
                <Input
                  type="number"
                  value={formData.loan_balance ?? ''}
                  onChange={(e) => setField('loan_balance', e.target.value ? Number(e.target.value) : null)}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label>Weekly rental income ($)</Label>
                <Input
                  type="number"
                  value={formData.rental_income_weekly ?? ''}
                  onChange={(e) => setField('rental_income_weekly', e.target.value ? Number(e.target.value) : null)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Tenanted until</Label>
              <Input
                type="date"
                value={formData.tenanted_until || ''}
                onChange={(e) => setField('tenanted_until', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setField('notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              style={{ backgroundColor: branding.primaryColor }}
              className="text-white hover:opacity-90"
            >
              {saving ? 'Saving...' : editingProperty ? 'Update Property' : 'Add Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this property from your portfolio? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-300/70 hover:bg-red-300 text-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
