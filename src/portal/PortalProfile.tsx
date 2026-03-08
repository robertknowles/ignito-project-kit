import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useBranding } from '@/contexts/BrandingContext'
import { usePortalClient } from '@/hooks/usePortalClient'
import { toast } from 'sonner'

// Field config for each section
interface FieldConfig {
  label: string
  key: string
  type: 'text' | 'number' | 'date' | 'select' | 'currency'
  options?: string[]
}

const PERSONAL_FIELDS: FieldConfig[] = [
  { label: 'FULL NAME', key: 'name', type: 'text' },
  { label: 'EMAIL ADDRESS', key: 'email', type: 'text' },
  { label: 'PHONE NUMBER', key: 'phone', type: 'text' },
  { label: 'DATE OF BIRTH', key: 'date_of_birth', type: 'date' },
  { label: 'CURRENT ADDRESS', key: 'address', type: 'text' },
  { label: 'MARITAL STATUS', key: 'marital_status', type: 'select', options: ['Single', 'Married', 'De facto', 'Divorced', 'Widowed'] },
  { label: 'DEPENDANTS', key: 'dependants', type: 'number' },
]

const FINANCIAL_FIELDS: FieldConfig[] = [
  { label: 'EMPLOYMENT', key: 'employment', type: 'select', options: ['Full-time', 'Part-time', 'Casual', 'Self-employed', 'Contractor', 'Not employed'] },
  { label: 'ANNUAL INCOME', key: 'annual_income', type: 'currency' },
  { label: 'PARTNER INCOME', key: 'partner_income', type: 'currency' },
  { label: 'AVAILABLE SAVINGS', key: 'available_savings', type: 'currency' },
  { label: 'BORROWING CAPACITY', key: 'borrowing_capacity', type: 'currency' },
  { label: 'PRE-APPROVAL STATUS', key: 'pre_approval_status', type: 'select', options: ['Not started', 'In progress', 'Approved', 'Expired'] },
]

const PREFERENCE_FIELDS: FieldConfig[] = [
  { label: 'RISK TOLERANCE', key: 'risk_tolerance', type: 'select', options: ['Conservative', 'Moderate', 'Aggressive'] },
  { label: 'PRIMARY GOAL', key: 'primary_goal', type: 'select', options: ['Capital growth', 'Cash flow', 'Balanced', 'First home', 'Retirement planning'] },
  { label: 'PREFERRED PROPERTY TYPE', key: 'preferred_property_type', type: 'select', options: ['House', 'Unit/Apartment', 'Townhouse', 'Land', 'Any'] },
  { label: 'PREFERRED LOCATIONS', key: 'preferred_locations', type: 'text' },
  { label: 'PURCHASE TIMELINE', key: 'purchase_timeline', type: 'select', options: ['0-3 months', '3-6 months', '6-12 months', '12+ months', 'Not sure'] },
]

// Format a currency value
const formatCurrency = (val: number | null | undefined) => {
  if (val == null) return '--'
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(val)
}

// Get display value from client data
const getDisplayValue = (client: Record<string, any> | null, field: FieldConfig): string => {
  if (!client) return '--'
  const val = client[field.key]
  if (val == null || val === '') return '--'
  if (field.type === 'currency') return formatCurrency(val as number)
  if (field.type === 'date') {
    return new Date(val as string).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return String(val)
}

export const PortalProfile = () => {
  const { user } = useAuth()
  const { branding } = useBranding()
  const { client, loading, updateClientFields } = usePortalClient()

  // Edit state per section
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  const displayName = client?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Client'

  // Start editing a section
  const startEditing = (sectionKey: string, fields: FieldConfig[]) => {
    const values: Record<string, any> = {}
    fields.forEach(f => {
      values[f.key] = client ? (client as Record<string, any>)[f.key] ?? '' : ''
    })
    setEditValues(values)
    setEditingSection(sectionKey)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingSection(null)
    setEditValues({})
  }

  // Save edits
  const saveEdits = async () => {
    setSaving(true)
    const success = await updateClientFields(editValues)
    if (success) {
      toast.success('Profile updated!')
      setEditingSection(null)
      setEditValues({})
    } else {
      toast.error('Failed to save changes')
    }
    setSaving(false)
  }

  // Update a single field value
  const setFieldValue = (key: string, value: any) => {
    setEditValues(prev => ({ ...prev, [key]: value }))
  }

  // Render input for a field in edit mode
  const renderInput = (field: FieldConfig) => {
    const value = editValues[field.key] ?? ''

    if (field.type === 'select' && field.options) {
      return (
        <select
          value={value}
          onChange={(e) => setFieldValue(field.key, e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="">Select...</option>
          {field.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }

    if (field.type === 'date') {
      return (
        <input
          type="date"
          value={value ? String(value).split('T')[0] : ''}
          onChange={(e) => setFieldValue(field.key, e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      )
    }

    if (field.type === 'number' || field.type === 'currency') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => setFieldValue(field.key, e.target.value ? Number(e.target.value) : null)}
          placeholder={field.type === 'currency' ? '$0' : '0'}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      )
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setFieldValue(field.key, e.target.value)}
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
    )
  }

  // Render a section (view or edit mode)
  const renderSection = (title: string, sectionKey: string, fields: FieldConfig[]) => {
    const isEditing = editingSection === sectionKey

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveEdits}
                disabled={saving}
                className="text-sm font-medium text-white px-3 py-1 rounded-lg transition-colors"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEditing(sectionKey, fields)}
              className="text-sm font-medium hover:opacity-80"
              style={{ color: branding.primaryColor }}
            >
              Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          {fields.map((field) => (
            <div key={field.key}>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                {field.label}
              </p>
              {isEditing ? (
                renderInput(field)
              ) : (
                <p className="text-sm text-gray-900">
                  {getDisplayValue(client as Record<string, any> | null, field)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-500">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold"
          style={{ backgroundColor: branding.primaryColor }}
        >
          {displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          <p className="text-sm text-gray-500">
            {client?.email || user?.email || ''}
          </p>
        </div>
      </div>

      {/* Sections */}
      {renderSection('Personal details', 'personal', PERSONAL_FIELDS)}
      {renderSection('Financial snapshot', 'financial', FINANCIAL_FIELDS)}
      {renderSection('Investment preferences', 'preferences', PREFERENCE_FIELDS)}

      {/* Info banner */}
      <div className="flex items-start gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
        <span className="mt-0.5">ℹ️</span>
        <p>
          Any changes you save here are automatically shared with your Buyers Agent and update
          your investment profile. For significant financial changes, your agent may recommend
          sending a Profile Update form.
        </p>
      </div>
    </div>
  )
}
