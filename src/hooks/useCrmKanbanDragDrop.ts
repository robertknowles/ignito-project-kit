import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent, DragOverEvent, DragCancelEvent } from '@dnd-kit/core';
import { ContactStatus } from '@/lib/crmHelpers';

export interface DraggedContact {
  id: string;
  full_name: string;
  company_name: string;
  currentStatus: ContactStatus;
}

export function useCrmKanbanDragDrop(
  onStatusChange: (contactId: string, newStatus: ContactStatus) => Promise<void>
) {
  const [draggedContact, setDraggedContact] = useState<DraggedContact | null>(null);
  const [targetStatus, setTargetStatus] = useState<ContactStatus | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const contactData = event.active.data.current as DraggedContact;
    if (contactData) {
      setDraggedContact(contactData);
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const stageId = over.id as string;
      if (stageId.startsWith('stage-')) {
        setTargetStatus(stageId.replace('stage-', '') as ContactStatus);
      }
    } else {
      setTargetStatus(null);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { over } = event;

    if (!over || !draggedContact) {
      setDraggedContact(null);
      setTargetStatus(null);
      setIsDragging(false);
      return;
    }

    const stageId = over.id as string;
    if (!stageId.startsWith('stage-')) {
      setDraggedContact(null);
      setTargetStatus(null);
      setIsDragging(false);
      return;
    }

    const newStatus = stageId.replace('stage-', '') as ContactStatus;
    if (newStatus !== draggedContact.currentStatus) {
      onStatusChange(draggedContact.id, newStatus);
    }

    setDraggedContact(null);
    setTargetStatus(null);
    setIsDragging(false);
  }, [draggedContact, onStatusChange]);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setDraggedContact(null);
    setTargetStatus(null);
    setIsDragging(false);
  }, []);

  return {
    draggedContact,
    targetStatus,
    isDragging,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
