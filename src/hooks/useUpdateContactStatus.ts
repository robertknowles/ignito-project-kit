import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContactStatus, getTimestampPatch } from '@/lib/crmHelpers';
import { toast } from 'sonner';

export function useUpdateContactStatus() {
  const updateStatus = useCallback(async (contactId: string, newStatus: ContactStatus) => {
    const timestampPatch = getTimestampPatch(newStatus);

    const patch: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'not_contacted') {
      patch.connection_sent_at = null;
      patch.video_sent_at = null;
      patch.replied_at = null;
      patch.last_touch_at = null;
    } else {
      for (const [key, value] of Object.entries(timestampPatch)) {
        if (key === 'connection_sent_at' || key === 'video_sent_at' || key === 'replied_at') {
          const { data: existing } = await supabase
            .from('crm_contacts')
            .select(key)
            .eq('id', contactId)
            .single();
          if (existing && existing[key]) continue;
        }
        patch[key] = value;
      }
    }

    const { error } = await supabase
      .from('crm_contacts')
      .update(patch)
      .eq('id', contactId);

    if (error) {
      toast.error('Failed to update contact status');
    } else {
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
    }
  }, []);

  return updateStatus;
}
