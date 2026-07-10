import { useCallback } from 'react'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import type { PropertyInstanceDetails } from '../types/propertyInstance'
import type { RevertSnapshot } from '../types/existingProperty'

/**
 * Inverse of {@link useRemoveTimelineProperty}: puts a purchased property back
 * into the plan as the next purchase. The instance is re-created at the head of
 * the property order so it becomes the first feasible purchase again (surfacing
 * in the Next Purchase Brief), its detail is restored, and the type quantity is
 * incremented. Only the most recent purchase should be reverted (enforced by
 * the caller via RevertSnapshot.seq).
 */
export const useRevertPurchase = () => {
  const {
    propertyOrder,
    setPropertyOrder,
    updatePropertyQuantity,
    getPropertyQuantity,
  } = usePropertySelection()
  const { instances, setInstances } = usePropertyInstance()

  return useCallback((snapshot: RevertSnapshot) => {
    const { propertyId, details } = snapshot
    if (!propertyId || !details) return

    // Next free index for this type — avoids colliding with instances that were
    // renumbered after the original purchase removed this one.
    const nextIndex = getPropertyQuantity(propertyId)
    const newInstanceId = `${propertyId}_instance_${nextIndex}`

    const nextInstances: Record<string, PropertyInstanceDetails> = {
      ...instances,
      [newInstanceId]: details,
    }
    setInstances(nextInstances)
    // Prepend so it's evaluated first and becomes the next purchase.
    setPropertyOrder([newInstanceId, ...propertyOrder])
    updatePropertyQuantity(propertyId, nextIndex + 1)
  }, [propertyOrder, setPropertyOrder, instances, setInstances, updatePropertyQuantity, getPropertyQuantity])
}
