import { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  value: string;
  rows?: number;
  placeholder?: string;
  onSave: (value: string) => Promise<void>;
}

export function OutreachTemplateEditor({ value, rows = 4, placeholder, onSave }: Props) {
  const [localValue, setLocalValue] = useState(value);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debouncedValue = useDebounce(localValue, 1500);
  const lastPersistedRef = useRef(value);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync from parent when value changes externally
  useEffect(() => {
    setLocalValue(value);
    lastPersistedRef.current = value;
  }, [value]);

  // Auto-save on debounced value change
  useEffect(() => {
    if (debouncedValue === lastPersistedRef.current) return;
    persistValue(debouncedValue);
  }, [debouncedValue]);

  async function persistValue(val: string) {
    if (val === lastPersistedRef.current) return;
    setSaveState('saving');
    try {
      await onSave(val);
      lastPersistedRef.current = val;
      setSaveState('saved');
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      // Revert on error
      setLocalValue(lastPersistedRef.current);
      setSaveState('idle');
    }
  }

  function handleBlur() {
    if (localValue !== lastPersistedRef.current) {
      persistValue(localValue);
    }
  }

  return (
    <div className="space-y-1">
      <Textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        rows={rows}
        placeholder={placeholder}
        className="bg-background border-border text-foreground text-xs font-mono resize-none focus:ring-1 focus:ring-blue-500/30"
      />
      {saveState !== 'idle' && (
        <p className={`text-[10px] ${saveState === 'saving' ? 'text-muted-foreground' : 'text-green-500/70'}`}>
          {saveState === 'saving' ? 'Saving...' : 'Saved · just now'}
        </p>
      )}
    </div>
  );
}
