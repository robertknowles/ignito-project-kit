import React, { useState } from 'react';
import { useStorageHealth } from '@/hooks/useStorageHealth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, HardDrive, Trash2, Download, Upload, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const StorageManagement: React.FC = () => {
  const { health, checkHealth, cleanup, clearAll, createBackup, restoreBackup } = useStorageHealth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCleanup = async () => {
    setIsProcessing(true);
    try {
      const cleaned = cleanup();
      toast({
        title: 'Cleanup completed',
        description: `Removed ${cleaned} corrupted data entries.`,
      });
    } catch (error) {
      toast({
        title: 'Cleanup failed',
        description: 'An error occurred during cleanup.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAll = async () => {
    setIsProcessing(true);
    try {
      clearAll();
      toast({
        title: 'All data cleared',
        description: 'All client scenario data has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Clear failed',
        description: 'An error occurred while clearing data.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const backup = createBackup();
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `client-scenarios-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Backup exported',
        description: 'Client data backup has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export backup data.',
        variant: 'destructive',
      });
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const success = restoreBackup(content);
        if (success) {
          toast({
            title: 'Backup restored',
            description: 'Client data has been successfully restored.',
          });
        } else {
          throw new Error('Invalid backup format');
        }
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Failed to restore backup data. Please check the file format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input value
    event.target.value = '';
  };

  const getStorageStatusBadge = () => {
    if (!health.isAvailable) {
      return <Badge variant="destructive">Unavailable</Badge>;
    }
    if (health.isNearLimit) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (health.isLowSpace) {
      return <Badge variant="outline">Low Space</Badge>;
    }
    return <Badge variant="secondary">Good</Badge>;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Storage Management
        </CardTitle>
        <CardDescription>
          Manage client scenario data storage and system performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Storage Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Storage Status</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(health.usage.used)} used of {formatBytes(health.usage.used + health.usage.available)}
            </p>
          </div>
          {getStorageStatusBadge()}
        </div>

        {/* Storage Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Storage Usage</span>
            <span>{health.usage.percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                health.isNearLimit 
                  ? 'bg-red-500' 
                  : health.isLowSpace 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(health.usage.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Warning Messages */}
        {(health.isLowSpace || health.isNearLimit || !health.isAvailable) && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <div className="text-sm">
              {!health.isAvailable && (
                <p className="text-red-600 font-medium">Storage is not available. Auto-save is disabled.</p>
              )}
              {health.isNearLimit && (
                <p className="text-red-600 font-medium">Storage is nearly full. Consider cleaning up or exporting data.</p>
              )}
              {health.isLowSpace && !health.isNearLimit && (
                <p className="text-yellow-600">Storage space is running low. Consider cleaning up old data.</p>
              )}
            </div>
          </div>
        )}

        {/* Client Data Info */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium">Stored Clients</p>
            <p className="text-2xl font-bold text-blue-600">{health.clientCount}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Data Size</p>
            <p className="text-2xl font-bold text-green-600">{formatBytes(health.usage.used)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={checkHealth}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            onClick={handleCleanup}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Cleanup
          </Button>

          <Button
            variant="outline"
            onClick={handleExportBackup}
            disabled={isProcessing || health.clientCount === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Backup
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              disabled={isProcessing}
              className="flex items-center gap-2 w-full"
              onClick={() => document.getElementById('backup-import')?.click()}
            >
              <Upload className="h-4 w-4" />
              Import Backup
            </Button>
            <input
              id="backup-import"
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h3>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isProcessing || health.clientCount === 0}
                className="w-full"
              >
                Clear All Client Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Client Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All client scenarios and their data will be permanently deleted from local storage.
                  Make sure you have exported a backup if you want to preserve this data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Clear All Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};