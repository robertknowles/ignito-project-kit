import React, { useState, useRef, useEffect } from 'react';
import { MessageSquarePlusIcon, XIcon, SendIcon, CheckCircleIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const LS_KEY = 'beta_feedback_queue';

interface QueuedFeedback {
  user_id: string | null;
  user_email: string | null;
  page_url: string;
  feedback: string;
  created_at: string;
}

function getQueue(): QueuedFeedback[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function addToQueue(entry: QueuedFeedback) {
  const queue = getQueue();
  queue.push(entry);
  localStorage.setItem(LS_KEY, JSON.stringify(queue));
}

function clearQueue() {
  localStorage.removeItem(LS_KEY);
}

async function flushQueue() {
  const queue = getQueue();
  if (!queue.length) return;

  const { error } = await supabase.from('beta_feedback' as any).insert(queue as any);
  if (!error) {
    clearQueue();
  }
}

export const BetaFeedbackWidget: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // On mount, try to flush any queued feedback from previous failed attempts
  useEffect(() => {
    setPendingCount(getQueue().length);
    flushQueue().then(() => setPendingCount(getQueue().length));
  }, []);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (status !== 'sending') {
          setOpen(false);
        }
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, status]);

  const handleSubmit = async () => {
    const trimmed = feedback.trim();
    if (!trimmed) return;

    setStatus('sending');

    const entry: QueuedFeedback = {
      user_id: user?.id || null,
      user_email: user?.email || null,
      page_url: window.location.pathname,
      feedback: trimmed,
      created_at: new Date().toISOString(),
    };

    // Save to localStorage FIRST — the feedback is safe before we even try Supabase
    addToQueue(entry);
    setPendingCount(getQueue().length);

    const { error } = await supabase.from('beta_feedback' as any).insert(entry as any);

    if (error) {
      setStatus('error');
      console.error('Feedback save failed (backed up in localStorage):', error);
      return;
    }

    // Success — remove from the queue
    const queue = getQueue();
    queue.pop();
    if (queue.length) {
      localStorage.setItem(LS_KEY, JSON.stringify(queue));
    } else {
      clearQueue();
    }

    // Also try to flush any older queued entries
    await flushQueue();
    setPendingCount(getQueue().length);

    setStatus('sent');
    setFeedback('');
    setTimeout(() => {
      setOpen(false);
      setStatus('idle');
    }, 1500);
  };

  return (
    <>
      {/* Floating panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-6 left-[272px] z-[9999] w-[340px] rounded-xl shadow-2xl border-2 border-yellow-400 bg-yellow-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-yellow-400">
            <span className="text-sm font-bold text-yellow-900">Beta Feedback</span>
            <button
              onClick={() => { if (status !== 'sending') { setOpen(false); } }}
              className="p-0.5 rounded hover:bg-yellow-500 bg-transparent border-none cursor-pointer transition"
            >
              <XIcon size={16} className="text-yellow-900" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {status === 'sent' ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <CheckCircleIcon size={32} className="text-green-600" />
                <p className="text-sm font-semibold text-green-800">Thanks! Feedback saved.</p>
              </div>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What's on your mind? Bugs, ideas, anything..."
                  disabled={status === 'sending'}
                  className="w-full h-28 rounded-lg border border-yellow-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmit();
                    }
                  }}
                />
                {status === 'error' && (
                  <p className="text-xs text-red-600 mt-1">
                    Save failed, but your feedback is backed up locally. It'll retry next time.
                  </p>
                )}
                {pendingCount > 0 && status !== 'error' && (
                  <p className="text-xs text-yellow-700 mt-1">
                    {pendingCount} unsent {pendingCount === 1 ? 'entry' : 'entries'} queued — will retry automatically.
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-yellow-700">⌘+Enter to send</span>
                  <button
                    onClick={handleSubmit}
                    disabled={!feedback.trim() || status === 'sending'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-sm font-semibold border-none cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <SendIcon size={14} />
                    {status === 'sending' ? 'Saving...' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toggle button — rendered outside, controlled by parent */}
      <BetaFeedbackToggle open={open} onToggle={() => setOpen(!open)} />
    </>
  );
};

export const BetaFeedbackToggle: React.FC<{ open: boolean; onToggle: () => void }> = ({ open, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`group/item p-2 relative flex max-h-9 w-full cursor-pointer items-center rounded-md transition duration-100 ease-linear select-none border-none text-left ${
        open
          ? 'bg-yellow-100 hover:bg-yellow-200'
          : 'bg-transparent hover:bg-yellow-50'
      }`}
    >
      <MessageSquarePlusIcon
        size={20}
        className={`mr-2 shrink-0 transition duration-100 ${
          open ? 'text-yellow-600' : 'text-yellow-500 group-hover/item:text-yellow-600'
        }`}
      />
      <span
        className={`flex-1 text-sm font-semibold truncate transition duration-100 ${
          open ? 'text-yellow-800' : 'text-yellow-700 group-hover/item:text-yellow-800'
        }`}
      >
        Feedback
      </span>
    </button>
  );
};
