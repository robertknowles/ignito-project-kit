import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CompanyWithContacts } from '@/lib/crmHelpers';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddCompanyDialog } from './AddCompanyDialog';

const contactSchema = z.object({
  company_id: z.string().min(1, 'Company is required'),
  full_name: z.string().min(1, 'Name is required'),
  title: z.string().optional(),
  linkedin_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  status: z.enum([
    'not_contacted', 'connection_sent', 'connected', 'video_sent',
    'replied', 'demo_booked', 'beta_tester', 'dead',
  ]),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: CompanyWithContacts[];
  onCreated: () => void;
}

export function AddContactDialog({ open, onOpenChange, companies, onCreated }: Props) {
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      company_id: '',
      full_name: '',
      title: '',
      linkedin_url: '',
      status: 'connection_sent',
    },
  });

  const selectedCompanyId = form.watch('company_id');
  const selectedCompanyName = companies.find(c => c.id === selectedCompanyId)?.name ?? '';

  const onSubmit = async (data: ContactFormData) => {
    const insert: Record<string, unknown> = {
      company_id: data.company_id,
      full_name: data.full_name,
      status: data.status,
    };
    if (data.title) insert.title = data.title;
    if (data.linkedin_url) insert.linkedin_url = data.linkedin_url;

    if (data.status === 'connection_sent') {
      insert.connection_sent_at = new Date().toISOString();
      insert.last_touch_at = new Date().toISOString();
    }

    const { error } = await supabase.from('crm_contacts').insert(insert);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Contact added');
      form.reset();
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="crm-portal dark bg-background text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <Label>Company</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedCompanyName || 'Select company...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search companies..." />
                    <CommandList>
                      <CommandEmpty>No company found.</CommandEmpty>
                      <CommandGroup>
                        {companies.map(company => (
                          <CommandItem
                            key={company.id}
                            value={company.name}
                            onSelect={() => {
                              form.setValue('company_id', company.id);
                              setComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedCompanyId === company.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {company.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  <div className="border-t border-border p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => {
                        setComboboxOpen(false);
                        setAddCompanyOpen(true);
                      }}
                    >
                      + Create new company
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {form.formState.errors.company_id && (
                <p className="text-xs text-red-400 mt-1">{form.formState.errors.company_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contact-name">Full name</Label>
              <Input
                id="contact-name"
                {...form.register('full_name')}
                placeholder="Jane Smith"
              />
              {form.formState.errors.full_name && (
                <p className="text-xs text-red-400 mt-1">{form.formState.errors.full_name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contact-title">Title</Label>
              <Input
                id="contact-title"
                {...form.register('title')}
                placeholder="e.g. CEO, Director"
              />
            </div>

            <div>
              <Label htmlFor="contact-linkedin">LinkedIn URL</Label>
              <Input
                id="contact-linkedin"
                {...form.register('linkedin_url')}
                placeholder="https://linkedin.com/in/..."
              />
              {form.formState.errors.linkedin_url && (
                <p className="text-xs text-red-400 mt-1">{form.formState.errors.linkedin_url.message}</p>
              )}
            </div>

            <div>
              <Label>Initial status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(v) => form.setValue('status', v as ContactFormData['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="connection_sent">Connection sent</SelectItem>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="video_sent">Video sent</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="demo_booked">Demo booked</SelectItem>
                  <SelectItem value="beta_tester">Beta tester</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Add contact
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AddCompanyDialog
        open={addCompanyOpen}
        onOpenChange={setAddCompanyOpen}
        onCreated={onCreated}
      />
    </>
  );
}
