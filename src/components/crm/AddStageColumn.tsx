import { useState, useRef, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';

interface Props {
  onAdd: (label: string) => Promise<boolean>;
}

export function AddStageColumn({ onAdd }: Props) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSubmit() {
    if (saving) return;
    setSaving(true);
    const ok = await onAdd(label);
    setSaving(false);
    if (ok) {
      setLabel('');
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex-shrink-0 w-[220px]">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full px-3 py-2 rounded-md border border-dashed border-muted-foreground/30 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-muted-foreground/60 hover:bg-muted/30 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus size={13} /> Add column
        </button>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-[220px] rounded-md border border-border bg-card p-2 flex flex-col gap-2">
      <input
        ref={inputRef}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') { setLabel(''); setEditing(false); }
        }}
        placeholder="Column name"
        className="w-full bg-transparent border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !label.trim()}
          className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-[11px] font-semibold text-white transition-colors flex items-center gap-1"
        >
          {saving && <Loader2 size={10} className="animate-spin" />}
          Add column
        </button>
        <button
          type="button"
          onClick={() => { setLabel(''); setEditing(false); }}
          className="px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
