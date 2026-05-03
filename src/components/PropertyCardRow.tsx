/**
 * PropertyCardRow — horizontal-scroll row of compact property cards on the
 * dashboard, with a click-to-expand wide detail panel below the row.
 *
 * Sits between Investment Timeline and Equity Unlock Timeline charts.
 *
 * - Cards ordered left-to-right by purchase year (mirrors chart x-axis)
 * - X on each card removes that specific instance (precise per-card)
 * - + at end adds a generic property (BA edits it via the detail panel)
 * - Bucket-type change in detail panel fires AI re-plan via chatBus
 * - Slider/numeric edits cascade math only (live chart updates)
 */

import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { usePropertySelection } from '../contexts/PropertySelectionContext';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { PropertySummaryCard } from './PropertySummaryCard';
import { PropertyDetailPanel } from './PropertyDetailPanel';
import { AddToTimelineModal } from './AddToTimelineModal';
import { getCellDisplayLabel, type CellId } from '../utils/propertyCells';
import { dispatchChatSend } from '../utils/chatBus';
import type { PropertyInstanceDetails } from '../types/propertyInstance';

/** Default cell when no propertyType can be resolved. */
const DEFAULT_NEW_CELL_ID: CellId = 'metro-unit-cashflow';

const parseInstanceId = (
  instanceId: string
): { propertyId: string; index: number } | null => {
  const match = instanceId.match(/^(.+)_instance_(\d+)$/);
  if (!match) return null;
  return { propertyId: match[1], index: parseInt(match[2], 10) };
};

export const PropertyCardRow: React.FC = () => {
  const {
    propertyOrder,
    setPropertyOrder,
    propertyTypes,
    updatePropertyQuantity,
    getPropertyQuantity,
  } = usePropertySelection();
  const { instances, setInstances, updateInstance } = usePropertyInstance();
  const { profile } = useInvestmentProfile();
  const { timelineProperties } = useAffordabilityCalculator();

  const [expandedInstanceId, setExpandedInstanceId] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Build the list of cards to render — keyed by instanceId, ordered by
  // purchase year (falls back to propertyOrder position when year missing)
  const cards = useMemo(() => {
    const items = propertyOrder.map((instanceId, orderIdx) => {
      const instanceData = instances[instanceId];
      const timelineProp = timelineProperties.find(
        (tp) => tp.instanceId === instanceId
      );
      const rawYear = timelineProp?.affordableYear;
      const purchaseYear = Number.isFinite(rawYear)
        ? Math.floor(rawYear as number)
        : undefined;
      // Only flag as unplaceable when the user explicitly capped the timeline.
      // Without an explicit cap, the timeline auto-extends — we just hide the year
      // rather than nag the BA to extend something they never set.
      const isUnplaceable = rawYear === Infinity && profile.timelineYearsExplicit === true;

      // Resolve property type title from propertyId
      const parsed = parseInstanceId(instanceId);
      const propertyTypeMeta = parsed
        ? propertyTypes.find((p) => p.id === parsed.propertyId)
        : undefined;
      const propertyType =
        propertyTypeMeta?.title ?? timelineProp?.title ?? getCellDisplayLabel(DEFAULT_NEW_CELL_ID);

      return {
        instanceId,
        instanceData,
        propertyType,
        purchaseYear,
        isUnplaceable,
        orderIdx,
      };
    });

    // Sort by purchase year (undefined years sink to the end, preserving order)
    return items.sort((a, b) => {
      if (a.purchaseYear === undefined && b.purchaseYear === undefined) {
        return a.orderIdx - b.orderIdx;
      }
      if (a.purchaseYear === undefined) return 1;
      if (b.purchaseYear === undefined) return -1;
      if (a.purchaseYear !== b.purchaseYear) {
        return a.purchaseYear - b.purchaseYear;
      }
      return a.orderIdx - b.orderIdx;
    });
  }, [propertyOrder, instances, timelineProperties, propertyTypes]);

  // Precise per-instance removal: remove instanceId from propertyOrder,
  // delete instance data, decrement count, and renumber subsequent instances
  // of the same propertyId so future adds don't collide.
  const handleRemove = (instanceIdToRemove: string) => {
    const parsed = parseInstanceId(instanceIdToRemove);
    if (!parsed) return;
    const { propertyId, index: removedIndex } = parsed;

    // Find instances of the same propertyId with higher indices
    const idsToRenumber = propertyOrder
      .map((id) => ({ id, parsed: parseInstanceId(id) }))
      .filter(
        (x) =>
          x.parsed?.propertyId === propertyId &&
          x.parsed.index > removedIndex
      )
      .sort((a, b) => a.parsed!.index - b.parsed!.index);

    // Update propertyOrder: remove the target, renumber higher instances down
    setPropertyOrder(
      propertyOrder
        .filter((id) => id !== instanceIdToRemove)
        .map((id) => {
          const p = parseInstanceId(id);
          if (
            p &&
            p.propertyId === propertyId &&
            p.index > removedIndex
          ) {
            return `${propertyId}_instance_${p.index - 1}`;
          }
          return id;
        })
    );

    // Update instances atomically: delete target, renumber higher ones
    const nextInstances: Record<string, PropertyInstanceDetails> = {
      ...instances,
    };
    delete nextInstances[instanceIdToRemove];
    idsToRenumber.forEach(({ id, parsed: p }) => {
      const newId = `${propertyId}_instance_${p!.index - 1}`;
      const data = instances[id];
      if (data) {
        nextInstances[newId] = data;
        delete nextInstances[id];
      }
    });
    setInstances(nextInstances);

    // Decrement quantity
    updatePropertyQuantity(
      propertyId,
      Math.max(0, getPropertyQuantity(propertyId) - 1)
    );

    // Close detail panel if it was showing the removed property
    if (expandedInstanceId === instanceIdToRemove) {
      setExpandedInstanceId(null);
    }
  };

  // Open the property library so the BA picks the cell type explicitly.
  const handleAdd = () => {
    setIsLibraryOpen(true);
  };

  // Cell change in detail panel → fire AI re-plan via chat
  const handleBucketChange = (
    instanceId: string,
    propertyType: string,
    newCellId: CellId
  ) => {
    const positionLabel = (() => {
      const idx = cards.findIndex((c) => c.instanceId === instanceId);
      return idx >= 0 ? `property ${idx + 1}` : 'this property';
    })();
    const newLabel = getCellDisplayLabel(newCellId);
    const message = `Change ${positionLabel} from ${propertyType} to a ${newLabel} property — re-plan the rest of the timeline accordingly.`;
    dispatchChatSend(message);
  };

  // Slider / numeric field change — cascade math only
  const handleFieldChange = (
    instanceId: string,
    field: keyof PropertyInstanceDetails,
    value: any
  ) => {
    updateInstance(instanceId, { [field]: value });
  };

  if (cards.length === 0) {
    // Empty state — single + button
    return (
      <>
        <div className="flex items-center justify-center py-8">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <Plus size={16} />
            Add a property
          </button>
        </div>
        <AddToTimelineModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />
      </>
    );
  }

  const expandedCard = expandedInstanceId
    ? cards.find((c) => c.instanceId === expandedInstanceId)
    : null;

  return (
    <div className="space-y-4">
      {/* Card row — horizontal scroll for any property count */}
      <div className="overflow-x-auto -mx-2 px-2 pb-2">
        <div className="flex items-start gap-3" style={{ minWidth: 'min-content' }}>
          {cards.map((card) =>
            card.instanceData ? (
              <PropertySummaryCard
                key={card.instanceId}
                instanceId={card.instanceId}
                propertyType={card.propertyType}
                instanceData={card.instanceData}
                purchaseYear={card.purchaseYear}
                isUnplaceable={card.isUnplaceable}
                isExpanded={expandedInstanceId === card.instanceId}
                onClick={() =>
                  setExpandedInstanceId(
                    expandedInstanceId === card.instanceId
                      ? null
                      : card.instanceId
                  )
                }
                onRemove={() => handleRemove(card.instanceId)}
                onTypeChange={(newCellId) =>
                  handleBucketChange(
                    card.instanceId,
                    card.propertyType,
                    newCellId
                  )
                }
                onStateChange={(newState) =>
                  handleFieldChange(card.instanceId, 'state', newState)
                }
              />
            ) : null
          )}

          {/* + button — ghost card at the end */}
          <div className="flex-shrink-0" style={{ width: 220 }}>
            <div className="text-[11px] font-medium text-gray-400 mb-1.5 px-1">
              &nbsp;
            </div>
            <button
              onClick={handleAdd}
              className="w-full h-[88px] rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
              aria-label="Add property"
            >
              <Plus size={16} />
              Add property
            </button>
          </div>
        </div>
      </div>

      {/* Detail panel — wide, full width below the row */}
      {expandedCard && expandedCard.instanceData && (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <PropertyDetailPanel
            instanceId={expandedCard.instanceId}
            instanceData={expandedCard.instanceData}
            propertyType={expandedCard.propertyType}
            onFieldChange={(field, value) =>
              handleFieldChange(expandedCard.instanceId, field, value)
            }
            onBucketChange={(newBucket) =>
              handleBucketChange(
                expandedCard.instanceId,
                expandedCard.propertyType,
                newBucket
              )
            }
          />
        </div>
      )}

      <AddToTimelineModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />
    </div>
  );
};
