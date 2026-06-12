import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from 'sonner';
import { CompanyWithContacts, ContactStatus, PIPELINE_STAGES, DURATION_BY_STATUS } from '@/lib/crmHelpers';
import { useCrmKanbanDragDrop } from '@/hooks/useCrmKanbanDragDrop';
import { useCrmPipelineStages } from '@/hooks/useCrmPipelineStages';
import { PipelineColumn } from './PipelineColumn';
import { AddStageColumn } from './AddStageColumn';
import { CompanyLogo } from './CompanyLogo';

const STORAGE_KEY = 'crm_duration_overrides';

function loadOverrides(): Partial<Record<ContactStatus, number | null>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

interface Props {
  companies: CompanyWithContacts[];
  onStatusChange: (contactId: string, newStatus: ContactStatus) => Promise<void>;
  onAssignedChange?: () => void;
}

export interface PipelineContact {
  contact: CompanyWithContacts['contacts'][0];
  companyName: string;
  companyWebsite: string | null;
}

export function CrmKanban({ companies, onStatusChange, onAssignedChange }: Props) {
  const [durationOverrides, setDurationOverrides] = useState<Partial<Record<ContactStatus, number | null>>>(loadOverrides);
  const { stages: customStages, addStage, deleteStage, updateStageDuration } = useCrmPipelineStages();

  const {
    draggedContact,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useCrmKanbanDragDrop(onStatusChange);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Custom columns slot in between the built-in stages and Dead.
  const builtInStages = PIPELINE_STAGES.filter(s => s.status !== 'dead');
  const deadStage = PIPELINE_STAGES.find(s => s.status === 'dead')!;

  const contactsByStatus = new Map<ContactStatus, PipelineContact[]>();

  for (const stage of PIPELINE_STAGES) {
    contactsByStatus.set(stage.status, []);
  }
  for (const stage of customStages) {
    contactsByStatus.set(stage.stage_key, []);
  }

  const companyByName = new Map<string, CompanyWithContacts>();

  for (const company of companies) {
    companyByName.set(company.name, company);
    for (const contact of company.contacts) {
      if (contact.status === 'not_contacted') continue;
      const bucket = contactsByStatus.get(contact.status as ContactStatus);
      if (bucket) {
        bucket.push({ contact, companyName: company.name, companyWebsite: company.website });
      }
    }
  }

  function handleDurationChange(status: ContactStatus, days: number | null) {
    const next = { ...durationOverrides };
    if (days === DURATION_BY_STATUS[status]) {
      delete next[status];
    } else {
      next[status] = days;
    }
    setDurationOverrides(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function getEffectiveDuration(status: ContactStatus): number | null {
    return durationOverrides[status] !== undefined
      ? durationOverrides[status]!
      : DURATION_BY_STATUS[status] ?? null;
  }

  // Custom-stage durations live in the DB; fold them into the overrides map
  // so PipelineCard's overdue check sees them alongside the built-in ones.
  const cardOverrides: Partial<Record<ContactStatus, number | null>> = {
    ...Object.fromEntries(customStages.map(s => [s.stage_key, s.duration_days])),
    ...durationOverrides,
  };

  function handleDeleteStage(stageId: string, stageKey: string, label: string) {
    const occupants = contactsByStatus.get(stageKey)?.length ?? 0;
    if (occupants > 0) {
      toast.error(`Move the ${occupants} ${occupants === 1 ? 'person' : 'people'} out of "${label}" first`);
      return;
    }
    deleteStage(stageId);
  }

  const dragCompany = draggedContact ? companyByName.get(draggedContact.company_name) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-2 overflow-x-auto pb-2">
        {builtInStages.map(stage => (
          <PipelineColumn
            key={stage.status}
            status={stage.status}
            label={stage.label}
            contacts={contactsByStatus.get(stage.status) ?? []}
            onAssignedChange={onAssignedChange}
            durationDays={getEffectiveDuration(stage.status)}
            onDurationChange={(days) => handleDurationChange(stage.status, days)}
            durationOverrides={cardOverrides}
          />
        ))}
        {customStages.map(stage => (
          <PipelineColumn
            key={stage.stage_key}
            status={stage.stage_key}
            label={stage.label}
            contacts={contactsByStatus.get(stage.stage_key) ?? []}
            onAssignedChange={onAssignedChange}
            durationDays={stage.duration_days}
            onDurationChange={(days) => updateStageDuration(stage.id, days)}
            durationOverrides={cardOverrides}
            onDelete={() => handleDeleteStage(stage.id, stage.stage_key, stage.label)}
          />
        ))}
        <PipelineColumn
          key={deadStage.status}
          status={deadStage.status}
          label={deadStage.label}
          contacts={contactsByStatus.get(deadStage.status) ?? []}
          onAssignedChange={onAssignedChange}
          durationDays={getEffectiveDuration(deadStage.status)}
          onDurationChange={(days) => handleDurationChange(deadStage.status, days)}
          durationOverrides={cardOverrides}
        />
        <AddStageColumn onAdd={addStage} />
      </div>
      <DragOverlay>
        {draggedContact ? (
          <div className="bg-card border border-blue-500/50 rounded-md px-3 py-2 shadow-lg w-[200px] flex items-center gap-2">
            <CompanyLogo website={dragCompany?.website ?? null} name={draggedContact.company_name} size={18} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{draggedContact.full_name}</p>
              <p className="text-[10px] text-blue-300/70 truncate">{draggedContact.company_name}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
