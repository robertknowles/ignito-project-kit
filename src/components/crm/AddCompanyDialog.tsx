import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const companySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relevance_tier: z.enum(['high', 'medium', 'low']),
  employees: z.union([z.number().int().positive(), z.nan()]).optional(),
  state: z.string().optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  blurb: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddCompanyDialog({ open, onOpenChange, onCreated }: Props) {
  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      relevance_tier: 'medium',
      employees: undefined,
      state: '',
      website: '',
      blurb: '',
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    const insert: Record<string, unknown> = {
      name: data.name,
      relevance_tier: data.relevance_tier,
    };
    if (data.employees && !isNaN(data.employees)) insert.employees = data.employees;
    if (data.state) insert.state = data.state;
    if (data.website) insert.website = data.website;
    if (data.blurb) insert.blurb = data.blurb;

    const { error } = await supabase.from('crm_companies').insert(insert);

    if (error) {
      toast.error(error.message.includes('unique') ? 'A company with that name already exists' : error.message);
    } else {
      toast.success('Company added');
      form.reset();
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="crm-portal dark bg-background text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Add company</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="company-name">Name</Label>
            <Input
              id="company-name"
              {...form.register('name')}
              placeholder="Agency name"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-400 mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <Label>Relevance tier</Label>
            <Select
              value={form.watch('relevance_tier')}
              onValueChange={(v) => form.setValue('relevance_tier', v as 'high' | 'medium' | 'low')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="company-employees">Employees</Label>
            <Input
              id="company-employees"
              type="number"
              {...form.register('employees', { valueAsNumber: true })}
              placeholder="e.g. 25"
            />
          </div>

          <div>
            <Label htmlFor="company-state">State</Label>
            <Input
              id="company-state"
              {...form.register('state')}
              placeholder="e.g. NSW"
            />
          </div>

          <div>
            <Label htmlFor="company-website">Website</Label>
            <Input
              id="company-website"
              {...form.register('website')}
              placeholder="https://..."
            />
            {form.formState.errors.website && (
              <p className="text-xs text-red-400 mt-1">{form.formState.errors.website.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="company-blurb">Blurb</Label>
            <Textarea
              id="company-blurb"
              {...form.register('blurb')}
              placeholder="What does this company do?"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Add company
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
