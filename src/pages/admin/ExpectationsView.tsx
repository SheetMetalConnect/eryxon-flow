import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, formatDistanceToNow } from 'date-fns'
import { useExpectations } from '@/hooks/useExpectations'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { PageStatsRow } from '@/components/admin/PageStatsRow'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  ArrowRight,
  Inbox,
  FileText,
  AlertTriangle,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Expectation } from '@/integrations/supabase/types/tables/expectations'

type ExpectationStatusFilter = 'all' | 'active' | 'fulfilled' | 'violated' | 'superseded'

const ExpectationsView: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const [activeTab, setActiveTab] = useState<ExpectationStatusFilter>('all')
  
  const {
    expectations,
    isLoading,
    refetch,
  } = useExpectations()

  // Calculate stats from expectations
  const stats = React.useMemo(() => {
    const total = expectations.length
    const active = expectations.filter(e => !e.superseded_by).length
    const fulfilled = expectations.filter(e => {
      // An expectation is fulfilled if it has no violated exception
      return !e.superseded_by
    }).length
    const violated = 0 // Would need to join with exceptions
    
    return { total, active, fulfilled, violated }
  }, [expectations])

  const getStatusIcon = (expectation: Expectation) => {
    if (expectation.superseded_by) return <History className="h-4 w-4 text-muted-foreground" />
    return <Target className="h-4 w-4 text-[hsl(var(--color-info))]" />
  }

  const getStatusBadge = (expectation: Expectation) => {
    if (expectation.superseded_by) {
      return (
        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
          {t('admin:expectations.superseded', 'Superseded')}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs bg-[hsl(var(--color-info))]/10 text-[hsl(var(--color-info))] border-[hsl(var(--color-info))]/20">
        {t('admin:expectations.active', 'Active')}
      </Badge>
    )
  }

  const formatExpectedValue = (value: Record<string, unknown> | null) => {
    if (!value) return '—'
    if (value.due_at) {
      return format(new Date(value.due_at as string), 'HH:mm')
    }
    if (value.duration_minutes) {
      return `${value.duration_minutes} min`
    }
    return JSON.stringify(value)
  }

  const renderExpectationCard = (expectation: Expectation) => {
    const expectedValue = expectation.expected_value as Record<string, unknown> | null

    return (
      <Card
        key={expectation.id}
        className={cn(
          'glass-card transition-all hover:shadow-lg',
          expectation.superseded_by && 'opacity-60'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs font-mono">
                  v{expectation.version}
                </Badge>
                {getStatusBadge(expectation)}
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(expectation.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Belief Statement */}
              <div className="mb-3">
                <p className="text-sm font-medium">"{expectation.belief_statement}"</p>
              </div>

              {/* Details */}
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('admin:expectations.due', 'Due')}:</span>
                  <span className="font-medium">
                    {expectation.expected_at 
                      ? format(new Date(expectation.expected_at), 'HH:mm')
                      : formatExpectedValue(expectedValue)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('admin:expectations.type', 'Type')}:</span>
                  <span className="font-medium">{expectation.expectation_type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">{t('admin:expectations.source', 'Source')}:</span>
                  <Badge variant="secondary" className="text-xs">{expectation.source}</Badge>
                </div>
              </div>

              {/* Superseded info */}
              {expectation.superseded_by && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {t('admin:expectations.supersededNote', 'This expectation was superseded by a newer version')}
                </div>
              )}
            </div>

            {/* Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/50">
              {getStatusIcon(expectation)}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const filteredExpectations = React.useMemo(() => {
    switch (activeTab) {
      case 'active':
        return expectations.filter(e => !e.superseded_by)
      case 'superseded':
        return expectations.filter(e => e.superseded_by)
      default:
        return expectations
    }
  }, [expectations, activeTab])

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
        title={t('admin:expectations.title', 'Expectations')}
        description={t('admin:expectations.description', 'Explicit beliefs about what should happen. Each expectation is versioned and immutable.')}
        action={{
          label: t('common:refresh', 'Refresh'),
          onClick: () => refetch(),
          icon: RefreshCw,
        }}
      />

      {/* Stats Row */}
      <PageStatsRow
        stats={[
          {
            label: t('admin:expectations.total', 'Total'),
            value: stats.total,
            icon: Target,
            color: 'info',
          },
          {
            label: t('admin:expectations.active', 'Active'),
            value: stats.active,
            icon: Clock,
            color: 'warning',
          },
          {
            label: t('admin:expectations.fulfilled', 'Fulfilled'),
            value: stats.fulfilled,
            icon: CheckCircle2,
            color: 'success',
          },
          {
            label: t('admin:expectations.violated', 'Violated'),
            value: stats.violated,
            icon: XCircle,
            color: 'error',
          },
        ]}
      />

      {/* What is an Expectation? */}
      <Card className="glass-card border-[hsl(var(--color-info))]/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--color-info))]/10">
              <Target className="h-5 w-5 text-[hsl(var(--color-info))]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{t('admin:expectations.whatIsTitle', 'What is an Expectation?')}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {t('admin:expectations.whatIsDescription', 'An expectation is an explicit belief about what should happen in the future. Unlike alerts, expectations are created before reality unfolds. They have a lifecycle: Draft → Active → (Fulfilled | Violated | Superseded | Canceled).')}
              </p>
              
              {/* Lifecycle Diagram */}
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Badge variant="secondary" className="bg-muted">Draft</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="bg-[hsl(var(--color-info))]/10 text-[hsl(var(--color-info))] border-[hsl(var(--color-info))]/20">Active</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">(</span>
                <Badge variant="outline" className="bg-[hsl(var(--color-success))]/10 text-[hsl(var(--color-success))] border-[hsl(var(--color-success))]/20">Fulfilled</Badge>
                <span className="text-muted-foreground">|</span>
                <Badge variant="outline" className="bg-[hsl(var(--color-error))]/10 text-[hsl(var(--color-error))] border-[hsl(var(--color-error))]/20">Violated</Badge>
                <span className="text-muted-foreground">|</span>
                <Badge variant="outline" className="bg-muted text-muted-foreground">Superseded</Badge>
                <span className="text-muted-foreground">|</span>
                <Badge variant="outline" className="bg-muted text-muted-foreground">Canceled</Badge>
                <span className="text-muted-foreground">)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">
                {t('admin:expectations.onlyActiveEvaluated', 'Only Active expectations are evaluated against reality')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExpectationStatusFilter)}>
        <TabsList className="glass-card">
          <TabsTrigger value="all" className="gap-2">
            <Inbox className="h-4 w-4" />
            {t('admin:expectations.all', 'All')}
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {expectations.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Target className="h-4 w-4" />
            {t('admin:expectations.active', 'Active')}
          </TabsTrigger>
          <TabsTrigger value="superseded" className="gap-2">
            <History className="h-4 w-4" />
            {t('admin:expectations.superseded', 'Superseded')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredExpectations.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-16 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-2">
                  {t('admin:expectations.noExpectations', 'No expectations found')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('admin:expectations.noExpectationsDescription', 'Expectations are created automatically when jobs are created or scheduled.')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredExpectations.map(renderExpectationCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ExpectationsView
