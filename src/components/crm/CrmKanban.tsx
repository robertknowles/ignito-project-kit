import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CompanyWithContacts, ContactStatus, PIPELINE_STAGES } from '@/lib/crmHelpers';
import { useCrmKanbanDragDrop } from '@/hooks/useCrmKanbanDragDrop';
import { PipelineColumn } from './PipelineColumn';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  companies: CompanyWithContacts[];
  onStatusChange: (contactId: string, newStatus: ContactStatus) => Promise<void>;
}

export interface PipelineContact {
  contact: CompanyWithContacts['contacts'][0];
  companyName: string;
  companyWebsite: string | null;
}

export function CrmKanban({ companies, onStatusChange }: Props) {
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

  const contactsByStatus = new Map<ContactStatus, PipelineContact[]>();

  for (const stage of PIPELINE_STAGES) {
    contactsByStatus.set(stage.status, []);
  }

  // Build a lookup for drag overlay
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
        {PIPELINE_STAGES.map(stage => (
          <PipelineColumn
            key={stage.status}
            status={stage.status}
            label={stage.label}
            contacts={contactsByStatus.get(stage.status) ?? []}
          />
        ))}
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
