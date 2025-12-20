import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, formatDistanceToNow } from 'date-fns'
import { useExceptions } from '@/hooks/useExceptions'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { PageStatsRow } from '@/components/admin/PageStatsRow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  AlertCircle,
  ArrowRight,
  Inbox,
  Loader2,
  MessageSquare,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExceptionStatus, ExceptionWithExpectation, ExceptionType } from '@/integrations/supabase/types/tables/expectations'

const ExceptionInbox: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ExceptionStatus | 'all'>('open')
  const [selectedException, setSelectedException] = useState<ExceptionWithExpectation | null>(null)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false)
  const [rootCause, setRootCause] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [dismissReason, setDismissReason] = useState('')

  const {
    exceptions,
    stats,
    isLoading,
    refetch,
    acknowledge,
    resolve,
    dismiss,
    isAcknowledging,
    isResolving,
    isDismissing,
  } = useExceptions({ status: activeTab === 'all' ? 'all' : activeTab })

  const getExceptionTypeIcon = (type: ExceptionType) => {
    switch (type) {
      case 'late':
        return <Clock className="h-4 w-4" />
      case 'early':
        return <CheckCircle2 className="h-4 w-4" />
      case 'non_occurrence':
        return <XCircle className="h-4 w-4" />
      case 'exceeded':
        return <AlertTriangle className="h-4 w-4" />
      case 'under':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getExceptionTypeColor = (type: ExceptionType) => {
    switch (type) {
      case 'late':
        return 'bg-[hsl(var(--color-warning))]/10 text-[hsl(var(--color-warning))] border-[hsl(var(--color-warning))]/20'
      case 'early':
        return 'bg-[hsl(var(--color-info))]/10 text-[hsl(var(--color-info))] border-[hsl(var(--color-info))]/20'
      case 'non_occurrence':
        return 'bg-[hsl(var(--color-error))]/10 text-[hsl(var(--color-error))] border-[hsl(var(--color-error))]/20'
      case 'exceeded':
        return 'bg-[hsl(var(--color-warning))]/10 text-[hsl(var(--color-warning))] border-[hsl(var(--color-warning))]/20'
      case 'under':
        return 'bg-[hsl(var(--color-info))]/10 text-[hsl(var(--color-info))] border-[hsl(var(--color-info))]/20'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusColor = (status: ExceptionStatus) => {
    switch (status) {
      case 'open':
        return 'bg-[hsl(var(--color-error))]/10 text-[hsl(var(--color-error))] border-[hsl(var(--color-error))]/20'
      case 'acknowledged':
        return 'bg-[hsl(var(--color-warning))]/10 text-[hsl(var(--color-warning))] border-[hsl(var(--color-warning))]/20'
      case 'resolved':
        return 'bg-[hsl(var(--color-success))]/10 text-[hsl(var(--color-success))] border-[hsl(var(--color-success))]/20'
      case 'dismissed':
        return 'bg-muted text-muted-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const formatDeviation = (amount: number | null, unit: string | null) => {
    if (amount === null) return null
    const absAmount = Math.abs(amount)
    if (unit === 'minutes') {
      if (absAmount >= 60) {
        return `${Math.round(absAmount / 60)}h ${Math.round(absAmount % 60)}m`
      }
      return `${Math.round(absAmount)} min`
    }
    return `${absAmount} ${unit || ''}`
  }

  const handleAcknowledge = (exception: ExceptionWithExpectation) => {
    acknowledge(exception.id)
  }

  const handleResolveClick = (exception: ExceptionWithExpectation) => {
    setSelectedException(exception)
    setRootCause(exception.root_cause || '')
    setCorrectiveAction(exception.corrective_action || '')
    setResolveDialogOpen(true)
  }

  const handleResolveSubmit = () => {
    if (!selectedException) return
    resolve({
      exceptionId: selectedException.id,
      rootCause,
      correctiveAction,
    })
    setResolveDialogOpen(false)
    setSelectedException(null)
    setRootCause('')
    setCorrectiveAction('')
  }

  const handleDismissClick = (exception: ExceptionWithExpectation) => {
    setSelectedException(exception)
    setDismissDialogOpen(true)
  }

  const handleDismissSubmit = () => {
    if (!selectedException) return
    dismiss({
      exceptionId: selectedException.id,
      reason: dismissReason,
    })
    setDismissDialogOpen(false)
    setSelectedException(null)
    setDismissReason('')
  }

  const renderExceptionCard = (exception: ExceptionWithExpectation) => {
    const expectation = exception.expectation
    const expectedAt = expectation?.expected_at
    const expectedValue = expectation?.expected_value as Record<string, unknown> | null
    const actualValue = exception.actual_value as Record<string, unknown> | null

    return (
      <Card
        key={exception.id}
        className={cn(
          'glass-card transition-all hover:shadow-lg cursor-pointer',
          exception.status === 'open' && 'border-l-4 border-l-[hsl(var(--color-error))]'
        )}
        onClick={() => setSelectedException(exception)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className={cn('text-xs font-semibold uppercase', getExceptionTypeColor(exception.exception_type))}
                >
                  {getExceptionTypeIcon(exception.exception_type)}
                  <span className="ml-1">{exception.exception_type.replace('_', ' ')}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs', getStatusColor(exception.status))}
                >
                  {exception.status}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(exception.detected_at), { addSuffix: true })}
                </span>
              </div>

              {/* Violated Belief */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">{t('exceptionInbox.violatedBelief', 'Violated Belief')}</p>
                <p className="text-sm font-medium">"{expectation?.belief_statement}"</p>
              </div>

              {/* Expected vs Actual */}
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('exceptionInbox.expected', 'Expected')}:</span>
                  <span className="ml-1 font-medium">
                    {expectedAt ? format(new Date(expectedAt), 'HH:mm') : 
                     expectedValue?.due_at ? format(new Date(expectedValue.due_at as string), 'HH:mm') : '—'}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">{t('exceptionInbox.actual', 'Actual')}:</span>
                  <span className="ml-1 font-medium">
                    {exception.occurred_at 
                      ? format(new Date(exception.occurred_at), 'HH:mm')
                      : actualValue?.completed_at 
                        ? format(new Date(actualValue.completed_at as string), 'HH:mm')
                        : t('exceptionInbox.neverOccurred', 'Never occurred')}
                  </span>
                </div>
                {exception.deviation_amount !== null && (
                  <Badge variant="outline" className={cn(
                    'text-xs',
                    exception.deviation_amount > 0 
                      ? 'text-[hsl(var(--color-error))]' 
                      : 'text-[hsl(var(--color-success))]'
                  )}>
                    {exception.deviation_amount > 0 ? '+' : ''}
                    {formatDeviation(exception.deviation_amount, exception.deviation_unit)}
                  </Badge>
                )}
              </div>

              {/* Resolution note if resolved */}
              {exception.status === 'resolved' && exception.corrective_action && (
                <div className="mt-3 p-2 bg-[hsl(var(--color-success))]/5 rounded border border-[hsl(var(--color-success))]/20">
                  <p className="text-xs text-muted-foreground">{t('exceptionInbox.resolution', 'Resolution')}:</p>
                  <p className="text-sm">{exception.corrective_action}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {exception.status === 'open' && (
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAcknowledge(exception)
                  }}
                  disabled={isAcknowledging}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {t('exceptionInbox.acknowledge', 'Acknowledge')}
                </Button>
              </div>
            )}
            {exception.status === 'acknowledged' && (
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleResolveClick(exception)
                  }}
                  disabled={isResolving}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {t('exceptionInbox.resolve', 'Resolve')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDismissClick(exception)
                  }}
                  disabled={isDismissing}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  {t('exceptionInbox.dismiss', 'Dismiss')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <AdminPageHeader
        title={t('exceptionInbox.title', 'Exception Inbox')}
        description={t('exceptionInbox.description', 'Judgments derived from violated expectations. Review and learn.')}
        action={{
          label: t('common.refresh', 'Refresh'),
          onClick: () => refetch(),
          icon: RefreshCw,
        }}
      />

      {/* Stats Row */}
      {stats && (
        <PageStatsRow
          stats={[
            {
              label: t('exceptionInbox.open', 'Open'),
              value: stats.open_count || 0,
              icon: AlertTriangle,
              color: 'error',
            },
            {
              label: t('exceptionInbox.acknowledged', 'Acknowledged'),
              value: stats.acknowledged_count || 0,
              icon: Eye,
              color: 'warning',
            },
            {
              label: t('exceptionInbox.resolved', 'Resolved'),
              value: stats.resolved_count || 0,
              icon: CheckCircle2,
              color: 'success',
            },
            {
              label: t('exceptionInbox.avgResolutionTime', 'Avg Resolution'),
              value: stats.avg_resolution_time_hours 
                ? `${Math.round(stats.avg_resolution_time_hours)}h` 
                : '—',
              icon: Clock,
              color: 'info',
            },
          ]}
        />
      )}

      {/* Workflow Explanation */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--color-error))]/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-[hsl(var(--color-error))]">1</span>
                </div>
                <span className="text-sm font-medium">{t('exceptionInbox.open', 'Open')}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--color-warning))]/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-[hsl(var(--color-warning))]">2</span>
                </div>
                <span className="text-sm font-medium">{t('exceptionInbox.acknowledged', 'Acknowledged')}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--color-success))]/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-[hsl(var(--color-success))]">3</span>
                </div>
                <span className="text-sm font-medium">{t('exceptionInbox.resolved', 'Resolved')}</span>
              </div>
              <span className="text-muted-foreground mx-2">{t('common.or', 'or')}</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{t('exceptionInbox.dismissed', 'Dismissed')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExceptionStatus | 'all')}>
        <TabsList className="glass-card">
          <TabsTrigger value="open" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('exceptionInbox.open', 'Open')}
            {stats?.open_count ? (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {stats.open_count}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="acknowledged" className="gap-2">
            <Eye className="h-4 w-4" />
            {t('exceptionInbox.acknowledged', 'Acknowledged')}
            {stats?.acknowledged_count ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats.acknowledged_count}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {t('exceptionInbox.resolved', 'Resolved')}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <Inbox className="h-4 w-4" />
            {t('exceptionInbox.all', 'All')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {exceptions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-16 text-center">
                <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-2">
                  {activeTab === 'open' 
                    ? t('exceptionInbox.noOpenExceptions', 'No open exceptions')
                    : t('exceptionInbox.noExceptions', 'No exceptions found')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('exceptionInbox.noExceptionsDescription', 'Exceptions are created when reality misaligns with expectations.')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {exceptions.map(renderExceptionCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>{t('exceptionInbox.resolveException', 'Resolve Exception')}</DialogTitle>
            <DialogDescription>
              {t('exceptionInbox.resolveDescription', 'Document the root cause and corrective action taken.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="root-cause">{t('exceptionInbox.rootCause', 'Root Cause')}</Label>
              <Textarea
                id="root-cause"
                placeholder={t('exceptionInbox.rootCausePlaceholder', 'What caused this exception?')}
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="corrective-action">{t('exceptionInbox.correctiveAction', 'Corrective Action')}</Label>
              <Textarea
                id="corrective-action"
                placeholder={t('exceptionInbox.correctiveActionPlaceholder', 'What was done to address this?')}
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleResolveSubmit} disabled={isResolving}>
              {isResolving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {t('exceptionInbox.markResolved', 'Mark Resolved')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Dialog */}
      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>{t('exceptionInbox.dismissException', 'Dismiss Exception')}</DialogTitle>
            <DialogDescription>
              {t('exceptionInbox.dismissDescription', 'Explain why this exception is not actionable.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dismiss-reason">{t('exceptionInbox.dismissReason', 'Reason for Dismissal')}</Label>
              <Textarea
                id="dismiss-reason"
                placeholder={t('exceptionInbox.dismissReasonPlaceholder', 'Why is this exception being dismissed?')}
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDismissSubmit} disabled={isDismissing}>
              {isDismissing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {t('exceptionInbox.dismiss', 'Dismiss')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ExceptionInbox
