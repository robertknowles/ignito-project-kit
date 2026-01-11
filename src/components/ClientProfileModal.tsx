import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  DollarSign, 
  Target, 
  Calendar, 
  TrendingUp,
  MessageSquare,
  Plus,
  Lightbulb,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Link as LinkIcon,
} from 'lucide-react';
import { Client } from '@/contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CommunicationLogEntry } from '@/contexts/ScenarioSaveContext';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  clientStatus: {
    hasOnboardingId: boolean;
    isQuestionnaireCompleted: boolean;
    hasScenario: boolean;
    hasBeenViewed: boolean;
    clientViewedAt: string | null;
    onboardingId: string | null;
    scenarioId: number | null;
    shareId: string | null;
    investmentProfile: any | null;
    communicationLog: CommunicationLogEntry[] | null;
  } | null;
  onStatusChange?: () => void;
}

// Format currency for display
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);
};

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({
  isOpen,
  onClose,
  client,
  clientStatus,
  onStatusChange,
}) => {
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [communicationLog, setCommunicationLog] = useState<CommunicationLogEntry[]>([]);

  // Load communication log when modal opens
  useEffect(() => {
    if (clientStatus?.communicationLog) {
      setCommunicationLog(clientStatus.communicationLog);
    } else {
      setCommunicationLog([]);
    }
  }, [clientStatus?.communicationLog, isOpen]);

  if (!client) return null;

  const profile = clientStatus?.investmentProfile;

  // Add a new note to the communication log
  const handleAddNote = async () => {
    if (!newNote.trim() || !clientStatus?.scenarioId) {
      if (!clientStatus?.scenarioId) {
        toast.error('No scenario found for this client');
      }
      return;
    }

    setSavingNote(true);

    try {
      // Fetch current scenario data
      const { data: scenario, error: fetchError } = await supabase
        .from('scenarios')
        .select('data')
        .eq('id', clientStatus.scenarioId)
        .single();

      if (fetchError) throw fetchError;

      const currentData = scenario?.data as any || {};
      const existingLog = currentData.communicationLog || [];

      // Create new note entry
      const newEntry: CommunicationLogEntry = {
        id: Math.random().toString(36).substring(2, 15),
        date: new Date().toISOString(),
        note: newNote.trim(),
        author: 'Agent', // Could be dynamic based on logged-in user
      };

      const updatedLog = [newEntry, ...existingLog];

      // Update scenario with new communication log
      const { error: updateError } = await supabase
        .from('scenarios')
        .update({
          data: {
            ...currentData,
            communicationLog: updatedLog,
          },
        })
        .eq('id', clientStatus.scenarioId);

      if (updateError) throw updateError;

      // Update local state
      setCommunicationLog(updatedLog);
      setNewNote('');
      toast.success('Note added successfully');
      
      // Notify parent to refresh status
      onStatusChange?.();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  // Determine the next best action for this client
  const getNextBestAction = () => {
    if (!clientStatus?.hasOnboardingId) {
      return {
        icon: LinkIcon,
        title: 'Send Questionnaire',
        description: 'Send the onboarding questionnaire to collect client financial details.',
        color: 'text-blue-600 bg-blue-50',
      };
    }
    
    if (!clientStatus?.isQuestionnaireCompleted) {
      return {
        icon: Clock,
        title: 'Follow Up on Questionnaire',
        description: 'Client has not completed the questionnaire. Consider sending a reminder.',
        color: 'text-amber-600 bg-amber-50',
      };
    }
    
    if (!clientStatus?.hasScenario) {
      return {
        icon: FileText,
        title: 'Create Investment Scenario',
        description: 'Build an investment scenario based on the client\'s financial profile.',
        color: 'text-purple-600 bg-purple-50',
      };
    }
    
    if (!clientStatus?.shareId) {
      return {
        icon: Send,
        title: 'Share Report with Client',
        description: 'Generate and share the investment report with your client.',
        color: 'text-green-600 bg-green-50',
      };
    }
    
    if (!clientStatus?.hasBeenViewed) {
      return {
        icon: Clock,
        title: 'Awaiting Client Review',
        description: 'Report has been shared. Follow up to ensure client has reviewed it.',
        color: 'text-amber-600 bg-amber-50',
      };
    }
    
    return {
      icon: CheckCircle2,
      title: 'Schedule Follow-up Call',
      description: 'Client has reviewed the report. Schedule a call to discuss next steps.',
      color: 'text-green-600 bg-green-50',
    };
  };

  const nextAction = getNextBestAction();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#3b82f6] bg-opacity-60 flex items-center justify-center text-white text-sm">
              {client.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div className="text-lg font-semibold">{client.name}</div>
              <div className="text-sm font-normal text-gray-500">
                Client since {new Date(client.created_at).toLocaleDateString()}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Next Best Action Widget */}
          <div className={`rounded-lg p-4 ${nextAction.color}`}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white/50">
                <Lightbulb size={20} />
              </div>
              <div>
                <h3 className="font-medium text-sm">Next Best Action</h3>
                <p className="text-sm font-semibold mt-0.5">{nextAction.title}</p>
                <p className="text-xs mt-1 opacity-80">{nextAction.description}</p>
              </div>
            </div>
          </div>

          {/* Survey Snapshot */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <User size={16} className="text-gray-500" />
              Financial Profile
            </h3>
            
            {profile ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <DollarSign size={12} />
                    Deposit Pool
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(profile.depositPool || 0)}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <TrendingUp size={12} />
                    Borrowing Capacity
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(profile.borrowingCapacity || 0)}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <DollarSign size={12} />
                    Annual Savings
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(profile.annualSavings || 0)}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Calendar size={12} />
                    Timeline
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {profile.timelineYears || 15} years
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Target size={12} />
                    Equity Goal
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(profile.equityGoal || 0)}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Target size={12} />
                    Cashflow Goal
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(profile.cashflowGoal || 0)}/yr
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">
                  No financial profile available. Send the questionnaire to collect client details.
                </p>
              </div>
            )}
          </div>

          {/* Communication Log */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare size={16} className="text-gray-500" />
              Communication Log
            </h3>
            
            {/* Add Note Form */}
            <div className="mb-4">
              <Textarea
                placeholder="Add a note about this client..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || savingNote || !clientStatus?.scenarioId}
                >
                  <Plus size={14} className="mr-1" />
                  {savingNote ? 'Saving...' : 'Add Note'}
                </Button>
              </div>
            </div>
            
            {/* Notes List */}
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {communicationLog.length > 0 ? (
                communicationLog.map((entry) => (
                  <div key={entry.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{entry.author}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleDateString()} at{' '}
                        {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{entry.note}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No notes yet. Add your first note above.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
