import { useCallback } from 'react'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { track, EVENTS } from '@/lib/analytics'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import type { PropertyInstanceDetails } from '../types/propertyInstance'

export const parseInstanceId = (
  instanceId: string
): { propertyId: string; index: number } | null => {
  const match = instanceId.match(/^(.+)_instance_(\d+)$/)
  if (!match) return null
  return { propertyId: match[1], index: parseInt(match[2], 10) }
}

/**
 * Removes a property instance from the plan: drops it from the property
 * order, renumbers sibling instances of the same type, and decrements the
 * type quantity. Shared by the purchases table and the purchase brief's
 * "Purchased" action.
 */
export const useRemoveTimelineProperty = () => {
  const {
    propertyOrder,
    setPropertyOrder,
    updatePropertyQuantity,
    getPropertyQuantity,
  } = usePropertySelection()
  const { instances, setInstances } = usePropertyInstance()

  return useCallback((instanceIdToRemove: string) => {
    const parsed = parseInstanceId(instanceIdToRemove)
    if (!parsed) return
    const { propertyId, index: removedIndex } = parsed

    const idsToRenumber = propertyOrder
      .map(id => ({ id, parsed: parseInstanceId(id) }))
      .filter(x => x.parsed?.propertyId === propertyId && x.parsed.index > removedIndex)
      .sort((a, b) => a.parsed!.index - b.parsed!.index)

    setPropertyOrder(
      propertyOrder
        .filter(id => id !== instanceIdToRemove)
        .map(id => {
          const p = parseInstanceId(id)
          if (p && p.propertyId === propertyId && p.index > removedIndex) {
            return `${propertyId}_instance_${p.index - 1}`
          }
          return id
        })
    )

    const nextInstances: Record<string, PropertyInstanceDetails> = { ...instances }
    delete nextInstances[instanceIdToRemove]
    idsToRenumber.forEach(({ id, parsed: p }) => {
      const newId = `${propertyId}_instance_${p!.index - 1}`
      const data = instances[id]
      if (data) {
        nextInstances[newId] = data
        delete nextInstances[id]
      }
    })
    setInstances(nextInstances)
    updatePropertyQuantity(propertyId, Math.max(0, getPropertyQuantity(propertyId) - 1))
    track(EVENTS.propertyRemovedFromTimeline, { property_id: propertyId })
  }, [propertyOrder, setPropertyOrder, instances, setInstances, updatePropertyQuantity, getPropertyQuantity])
}
