/**
 * Upload Progress Component
 *
 * Displays real-time upload progress with:
 * - File names
 * - Upload progress bars
 * - MB uploaded / total MB
 * - Percentage
 * - Status indicators (uploading, completed, error)
 */

import { UploadProgress as UploadProgressType } from '@/hooks/useFileUpload';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2, FileUp } from 'lucide-react';
import { formatMB } from '@/lib/upload-with-progress';

interface UploadProgressProps {
  progress: UploadProgressType[];
  className?: string;
}

export function UploadProgress({ progress, className = '' }: UploadProgressProps) {
  if (progress.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {progress.map((file) => (
        <div
          key={file.fileIndex}
          className="border rounded-lg p-4 bg-white shadow-sm"
        >
          {/* File header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {file.status === 'pending' && (
                <FileUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
              {file.status === 'uploading' && (
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
              )}
              {file.status === 'completed' && (
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              )}
              {file.status === 'error' && (
                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              )}
              <p className="text-sm font-medium truncate" title={file.fileName}>
                {file.fileName}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm ml-3 flex-shrink-0">
              <span className="text-gray-600">
                {formatMB(file.uploadedMB)} / {formatMB(file.totalMB)}
              </span>
              <span className="font-semibold text-blue-600 min-w-[3rem] text-right">
                {file.percentage}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <Progress value={file.percentage} className="h-2" />

          {/* Error message */}
          {file.status === 'error' && file.error && (
            <p className="mt-2 text-xs text-red-600">
              {file.error}
            </p>
          )}

          {/* Status text */}
          {file.status === 'completed' && (
            <p className="mt-2 text-xs text-green-600">
              Upload completed successfully
            </p>
          )}
        </div>
      ))}

      {/* Overall summary */}
      {progress.length > 1 && (
        <div className="border-t pt-3 mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Total: {progress.length} file{progress.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-4 text-xs">
              <span className="text-gray-600">
                Completed: {progress.filter(p => p.status === 'completed').length}
              </span>
              {progress.some(p => p.status === 'error') && (
                <span className="text-red-600">
                  Failed: {progress.filter(p => p.status === 'error').length}
                </span>
              )}
              {progress.some(p => p.status === 'uploading') && (
                <span className="text-blue-600">
                  Uploading: {progress.filter(p => p.status === 'uploading').length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Storage Quota Display Component
 *
 * Shows current storage usage and limits
 */

import { StorageQuota } from '@/hooks/useFileUpload';
import { HardDrive, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface StorageQuotaDisplayProps {
  quota: StorageQuota | null;
  className?: string;
}

export function StorageQuotaDisplay({ quota, className = '' }: StorageQuotaDisplayProps) {
  if (!quota) {
    return null;
  }

  const isNearLimit = !quota.isUnlimited && quota.usedPercentage >= 80;
  const isAtLimit = !quota.isUnlimited && quota.usedPercentage >= 95;

  return (
    <div className={`border rounded-lg p-4 ${isAtLimit ? 'bg-red-50 border-red-200' : isNearLimit ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HardDrive className={`h-4 w-4 ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-600'}`} />
          <span className="text-sm font-medium">Storage Usage</span>
        </div>
        {quota.isUnlimited ? (
          <Badge variant="outline" className="bg-white">Unlimited</Badge>
        ) : (
          <span className="text-sm font-semibold">
            {formatMB(quota.currentMB)} / {formatMB(quota.maxMB || 0)}
          </span>
        )}
      </div>

      {!quota.isUnlimited && (
        <>
          <Progress
            value={quota.usedPercentage}
            className={`h-2 mb-2 ${isAtLimit ? '[&>div]:bg-red-600' : isNearLimit ? '[&>div]:bg-yellow-600' : ''}`}
          />
          <div className="flex items-center justify-between text-xs">
            <span className={isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-600'}>
              {quota.usedPercentage.toFixed(1)}% used
            </span>
            <span className="text-gray-600">
              {formatMB(quota.remainingMB)} remaining
            </span>
          </div>

          {isAtLimit && (
            <div className="mt-3 flex items-start gap-2 p-2 bg-red-100 rounded border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">
                Storage limit almost reached. Please upgrade your plan or delete old files to continue uploading.
              </p>
            </div>
          )}

          {isNearLimit && !isAtLimit && (
            <div className="mt-3 flex items-start gap-2 p-2 bg-yellow-100 rounded border border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                Storage usage is high. Consider upgrading your plan.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
