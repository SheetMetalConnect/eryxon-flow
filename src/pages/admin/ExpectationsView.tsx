import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { useExpectations, ExpectationWithStatus } from '@/hooks/useExpectations'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { PageStatsRow } from '@/components/admin/PageStatsRow'
import { Card, CardContent } from '@/components/ui/card'
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
  History,
  AlertTriangle,
  Briefcase,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ExpectationStatusFilter = 'all' | 'active' | 'overdue' | 'violated' | 'superseded'

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
    const active = expectations.filter(e => e.status === 'active').length
    const overdue = expectations.filter(e => e.status === 'overdue').length
    const violated = expectations.filter(e => e.status === 'violated').length
    const superseded = expectations.filter(e => e.status === 'superseded').length
    
    return { total, active, overdue, violated, superseded }
  }, [expectations])

  const getStatusIcon = (status: ExpectationWithStatus['status']) => {
    switch (status) {
      case 'active': return <Target className="h-4 w-4 text-[hsl(var(--color-info))]" />
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-[hsl(var(--color-warning))]" />
      case 'violated': return <XCircle className="h-4 w-4 text-[hsl(var(--color-error))]" />
      case 'superseded': return <History className="h-4 w-4 text-muted-foreground" />
      default: return <Target className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (expectation: ExpectationWithStatus) => {
    switch (expectation.status) {
      case 'active':
        return (
          <Badge variant="outline" className="text-xs bg-[hsl(var(--color-info))]/10 text-[hsl(var(--color-info))] border-[hsl(var(--color-info))]/20">
            {t('admin:expectations.active', 'Active')}
          </Badge>
        )
      case 'overdue':
        return (
          <Badge variant="outline" className="text-xs bg-[hsl(var(--color-warning))]/10 text-[hsl(var(--color-warning))] border-[hsl(var(--color-warning))]/20">
            {t('admin:expectations.overdue', 'Overdue')}
          </Badge>
        )
      case 'violated':
        return (
          <Badge variant="outline" className="text-xs bg-[hsl(var(--color-error))]/10 text-[hsl(var(--color-error))] border-[hsl(var(--color-error))]/20">
            {t('admin:expectations.violated', 'Violated')}
          </Badge>
        )
      case 'superseded':
        return (
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
            {t('admin:expectations.superseded', 'Superseded')}
          </Badge>
        )
      default:
        return null
    }
  }

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'job': return <Briefcase className="h-3.5 w-3.5" />
      case 'operation': return <Wrench className="h-3.5 w-3.5" />
      default: return <FileText className="h-3.5 w-3.5" />
    }
  }

  const renderExpectationCard = (expectation: ExpectationWithStatus) => {
    const isOverdue = expectation.status === 'overdue' || expectation.status === 'violated'

    return (
      <Card
        key={expectation.id}
        className={cn(
          'glass-card transition-all hover:shadow-lg',
          expectation.status === 'superseded' && 'opacity-60',
          expectation.status === 'violated' && 'border-[hsl(var(--color-error))]/30',
          expectation.status === 'overdue' && 'border-[hsl(var(--color-warning))]/30'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-mono">
                  v{expectation.version}
                </Badge>
                <Badge variant="secondary" className="text-xs gap-1">
                  {getEntityIcon(expectation.entity_type)}
                  {expectation.entity_type}
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
                  <span className={cn('font-medium', isOverdue && 'text-[hsl(var(--color-error))]')}>
                    {expectation.expected_at 
                      ? format(new Date(expectation.expected_at), 'MMM d, HH:mm')
                      : '—'}
                  </span>
                  {isOverdue && expectation.expected_at && (
                    <span className="text-xs text-[hsl(var(--color-error))]">
                      ({formatDistanceToNow(new Date(expectation.expected_at), { addSuffix: true })})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">{t('admin:expectations.source', 'Source')}:</span>
                  <Badge variant="secondary" className="text-xs">{expectation.source}</Badge>
                </div>
              </div>

              {/* Superseded info */}
              {expectation.status === 'superseded' && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {t('admin:expectations.supersededNote', 'This expectation was superseded by a newer version')}
                </div>
              )}

              {/* Violated info */}
              {expectation.status === 'violated' && expectation.exception_id && (
                <div className="mt-2 text-xs text-[hsl(var(--color-error))]">
                  ⚠️ {t('admin:expectations.violatedNote', 'This expectation was violated - see Exception Inbox')}
                </div>
              )}
            </div>

            {/* Icon */}
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full',
              expectation.status === 'active' && 'bg-[hsl(var(--color-info))]/10',
              expectation.status === 'overdue' && 'bg-[hsl(var(--color-warning))]/10',
              expectation.status === 'violated' && 'bg-[hsl(var(--color-error))]/10',
              expectation.status === 'superseded' && 'bg-muted/50'
            )}>
              {getStatusIcon(expectation.status)}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const filteredExpectations = React.useMemo(() => {
    switch (activeTab) {
      case 'active':
        return expectations.filter(e => e.status === 'active')
      case 'overdue':
        return expectations.filter(e => e.status === 'overdue')
      case 'violated':
        return expectations.filter(e => e.status === 'violated')
      case 'superseded':
        return expectations.filter(e => e.status === 'superseded')
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
          label: t('common:common.refresh'),
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
            color: 'success',
          },
          {
            label: t('admin:expectations.overdue', 'Overdue'),
            value: stats.overdue,
            icon: AlertTriangle,
            color: 'warning',
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
                {t('admin:expectations.whatIsDescription', 'An expectation is an explicit belief about what should happen in the future. Unlike alerts, expectations are created before reality unfolds. When reality diverges from expectation, an exception is raised.')}
              </p>
              
              {/* Lifecycle Diagram */}
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Badge variant="outline" className="bg-[hsl(var(--color-info))]/10 text-[hsl(var(--color-info))] border-[hsl(var(--color-info))]/20">Active</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">(</span>
                <Badge variant="outline" className="bg-[hsl(var(--color-success))]/10 text-[hsl(var(--color-success))] border-[hsl(var(--color-success))]/20">Fulfilled</Badge>
                <span className="text-muted-foreground">|</span>
                <Badge variant="outline" className="bg-[hsl(var(--color-error))]/10 text-[hsl(var(--color-error))] border-[hsl(var(--color-error))]/20">Violated</Badge>
                <span className="text-muted-foreground">|</span>
                <Badge variant="outline" className="bg-muted text-muted-foreground">Superseded</Badge>
                <span className="text-muted-foreground">)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExpectationStatusFilter)}>
        <TabsList className="glass-card flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="gap-2">
            <Inbox className="h-4 w-4" />
            {t('admin:expectations.all', 'All')}
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {stats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Target className="h-4 w-4" />
            {t('admin:expectations.active', 'Active')}
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {stats.active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('admin:expectations.overdue', 'Overdue')}
            {stats.overdue > 0 && (
              <Badge className="ml-1 h-5 px-1.5 bg-[hsl(var(--color-warning))] text-white">
                {stats.overdue}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="violated" className="gap-2">
            <XCircle className="h-4 w-4" />
            {t('admin:expectations.violated', 'Violated')}
            {stats.violated > 0 && (
              <Badge className="ml-1 h-5 px-1.5 bg-[hsl(var(--color-error))] text-white">
                {stats.violated}
              </Badge>
            )}
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
                  {t('admin:expectations.noExpectationsDescription', 'Expectations are created automatically when jobs get due dates or operations are scheduled.')}
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