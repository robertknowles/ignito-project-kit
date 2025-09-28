import React from 'react';
import { useAutoSave } from '@/contexts/AutoSaveContext';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveIndicatorProps {
  className?: string;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({ className }) => {
  const { saveStatus } = useAutoSave();

  const formatLastSaved = (lastSaved: string | null) => {
    if (!lastSaved) return 'Never';
    
    const date = new Date(lastSaved);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  const getStatusIcon = () => {
    if (saveStatus.isSaving) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    
    if (saveStatus.error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    
    if (saveStatus.hasUnsavedChanges) {
      return <Clock className="h-4 w-4 text-amber-500" />;
    }
    
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (saveStatus.isSaving) {
      return 'Saving...';
    }
    
    if (saveStatus.error) {
      return `Error: ${saveStatus.error}`;
    }
    
    if (saveStatus.hasUnsavedChanges) {
      return 'Unsaved changes';
    }
    
    return `Saved ${formatLastSaved(saveStatus.lastSaved)}`;
  };

  const getStatusColor = () => {
    if (saveStatus.isSaving) return 'text-blue-600';
    if (saveStatus.error) return 'text-red-600';
    if (saveStatus.hasUnsavedChanges) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <div className={cn(
      'flex items-center gap-2 text-sm transition-all duration-200',
      getStatusColor(),
      className
    )}>
      {getStatusIcon()}
      <span className="font-medium">
        {getStatusText()}
      </span>
    </div>
  );
};