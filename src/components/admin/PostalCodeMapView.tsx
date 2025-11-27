import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PostalCodeGroup } from '@/types/shipping';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Package,
  Weight,
  Box,
  Search,
  Building,
  Hash,
  Truck,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  LayoutGrid,
  List,
  Map,
  Info,
  Send,
  Plus,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PostalCodeMapViewProps {
  groups: PostalCodeGroup[];
  onCreateShipment: (jobIds: string[]) => void;
}

type ViewMode = 'cards' | 'list';
type SortBy = 'jobs' | 'weight' | 'postal_code' | 'city';

export default function PostalCodeMapView({ groups, onCreateShipment }: PostalCodeMapViewProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortBy, setSortBy] = useState<SortBy>('jobs');

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    let filtered = groups;

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.postal_code.toLowerCase().includes(query) ||
          g.city?.toLowerCase().includes(query) ||
          g.jobs.some(
            (j) =>
              j.job_number.toLowerCase().includes(query) ||
              j.customer?.toLowerCase().includes(query)
          )
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'jobs':
          return b.jobs.length - a.jobs.length;
        case 'weight':
          return b.total_weight - a.total_weight;
        case 'postal_code':
          return a.postal_code.localeCompare(b.postal_code);
        case 'city':
          return (a.city || '').localeCompare(b.city || '');
        default:
          return 0;
      }
    });

    return sorted;
  }, [groups, searchQuery, sortBy]);

  // Calculate totals for selected groups
  const selectedTotals = useMemo(() => {
    const selectedGroupsList = groups.filter((g) => selectedGroups.has(g.postal_code));
    return {
      jobs: selectedGroupsList.reduce((sum, g) => sum + g.jobs.length, 0),
      weight: selectedGroupsList.reduce((sum, g) => sum + g.total_weight, 0),
      volume: selectedGroupsList.reduce((sum, g) => sum + g.total_volume, 0),
      packages: selectedGroupsList.reduce((sum, g) => sum + g.total_packages, 0),
    };
  }, [groups, selectedGroups]);

  const toggleGroupSelection = (postalCode: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(postalCode)) {
        next.delete(postalCode);
      } else {
        next.add(postalCode);
      }
      return next;
    });
  };

  const toggleGroupExpanded = (postalCode: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(postalCode)) {
        next.delete(postalCode);
      } else {
        next.add(postalCode);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map((g) => g.postal_code)));
    }
  };

  const handleCreateShipment = () => {
    const selectedGroupsList = groups.filter((g) => selectedGroups.has(g.postal_code));
    const jobIds = selectedGroupsList.flatMap((g) => g.jobs.map((j) => j.id));
    onCreateShipment(jobIds);
    setSelectedGroups(new Set());
  };

  const getIntensityColor = (count: number, max: number) => {
    const ratio = count / Math.max(max, 1);
    if (ratio > 0.75) return 'bg-[hsl(var(--brand-primary))]/30 border-[hsl(var(--brand-primary))]/40';
    if (ratio > 0.5) return 'bg-[hsl(var(--brand-primary))]/20 border-[hsl(var(--brand-primary))]/30';
    if (ratio > 0.25) return 'bg-[hsl(var(--brand-primary))]/10 border-[hsl(var(--brand-primary))]/20';
    return 'bg-muted/50 border-border/50';
  };

  const maxJobs = Math.max(...groups.map((g) => g.jobs.length), 1);

  if (groups.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t('shipping.noJobsReady', 'No Jobs Ready to Ship')}
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            {t(
              'shipping.noJobsReadyDesc',
              'Complete manufacturing jobs to see them here. Jobs with delivery addresses will be grouped by postal code for efficient shipping.'
            )}
          </p>
          <div className="mt-6 p-4 rounded-lg bg-[hsl(var(--color-info))]/10 border border-[hsl(var(--color-info))]/20 max-w-md">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-[hsl(var(--color-info))] mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">{t('shipping.tipTitle', 'Tip:')}</span>{' '}
                {t(
                  'shipping.addPostalCodeTip',
                  'Add delivery postal codes to your jobs when creating them to enable automatic location-based grouping.'
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('shipping.searchLocations', 'Search locations, jobs, customers...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-[150px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jobs">{t('shipping.sortByJobs', 'Most Jobs')}</SelectItem>
            <SelectItem value="weight">{t('shipping.sortByWeight', 'Heaviest')}</SelectItem>
            <SelectItem value="postal_code">{t('shipping.sortByPostal', 'Postal Code')}</SelectItem>
            <SelectItem value="city">{t('shipping.sortByCity', 'City')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
          <Button
            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={selectAll}>
          {selectedGroups.size === filteredGroups.length
            ? t('shipping.deselectAll', 'Deselect All')
            : t('shipping.selectAll', 'Select All')}
        </Button>
      </div>

      {/* Selection Summary Bar */}
      {selectedGroups.size > 0 && (
        <Card className="glass-card border-[hsl(var(--brand-primary))]/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                  <span className="font-medium">{selectedGroups.size} {t('shipping.locationsSelected', 'locations selected')}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {selectedTotals.jobs} {t('shipping.jobs', 'jobs')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Weight className="h-3.5 w-3.5" />
                    {selectedTotals.weight.toFixed(1)} kg
                  </span>
                  {selectedTotals.volume > 0 && (
                    <span className="flex items-center gap-1">
                      <Box className="h-3.5 w-3.5" />
                      {selectedTotals.volume.toFixed(2)} m³
                    </span>
                  )}
                </div>
              </div>
              <Button className="cta-button" onClick={handleCreateShipment}>
                <Truck className="mr-2 h-4 w-4" />
                {t('shipping.createShipmentForSelected', 'Create Shipment')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups Display */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const isSelected = selectedGroups.has(group.postal_code);
            const isExpanded = expandedGroups.has(group.postal_code);

            return (
              <Card
                key={group.postal_code}
                className={cn(
                  'glass-card cursor-pointer transition-all hover:scale-[1.02]',
                  getIntensityColor(group.jobs.length, maxJobs),
                  isSelected && 'ring-2 ring-[hsl(var(--brand-primary))]'
                )}
                onClick={() => toggleGroupSelection(group.postal_code)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleGroupSelection(group.postal_code)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                          {group.postal_code}
                        </CardTitle>
                        {group.city && (
                          <CardDescription className="text-sm">{group.city}</CardDescription>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-background/50">
                      {group.jobs.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Weight className="h-3.5 w-3.5" />
                      {group.total_weight.toFixed(1)} kg
                    </span>
                    {group.total_volume > 0 && (
                      <span className="flex items-center gap-1">
                        <Box className="h-3.5 w-3.5" />
                        {group.total_volume.toFixed(2)} m³
                      </span>
                    )}
                  </div>

                  <Collapsible open={isExpanded} onOpenChange={() => toggleGroupExpanded(group.postal_code)}>
                    <CollapsibleTrigger
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      {t('shipping.viewJobs', 'View jobs')}
                    </CollapsibleTrigger>
                    <CollapsibleContent onClick={(e) => e.stopPropagation()}>
                      <div className="mt-2 space-y-1">
                        {group.jobs.slice(0, 5).map((job) => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between text-xs p-1.5 rounded bg-background/30"
                          >
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3 text-muted-foreground" />
                              {job.job_number}
                            </span>
                            {job.customer && (
                              <span className="text-muted-foreground truncate max-w-[100px]">
                                {job.customer}
                              </span>
                            )}
                          </div>
                        ))}
                        {group.jobs.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center pt-1">
                            +{group.jobs.length - 5} {t('shipping.moreJobs', 'more jobs')}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-card">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-border/50">
              {filteredGroups.map((group) => {
                const isSelected = selectedGroups.has(group.postal_code);
                const isExpanded = expandedGroups.has(group.postal_code);

                return (
                  <Collapsible
                    key={group.postal_code}
                    open={isExpanded}
                    onOpenChange={() => toggleGroupExpanded(group.postal_code)}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-muted/30',
                        isSelected && 'bg-[hsl(var(--brand-primary))]/5'
                      )}
                      onClick={() => toggleGroupSelection(group.postal_code)}
                    >
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleGroupSelection(group.postal_code)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                          <div>
                            <div className="font-medium">{group.postal_code}</div>
                            {group.city && <div className="text-sm text-muted-foreground">{group.city}</div>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {group.jobs.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <Weight className="h-3.5 w-3.5" />
                            {group.total_weight.toFixed(1)} kg
                          </span>
                        </div>

                        <CollapsibleTrigger
                          className="p-1 rounded hover:bg-muted"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="bg-muted/20 border-t border-border/30">
                        {group.jobs.map((job) => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between px-4 py-2 border-b border-border/20 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{job.job_number}</span>
                              {job.customer && (
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {job.customer}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {job.weight_kg && (
                                <span>{job.weight_kg} kg</span>
                              )}
                              {job.volume_m3 && (
                                <span>{job.volume_m3} m³</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Stats Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>
          {t('shipping.showingLocations', 'Showing')} {filteredGroups.length} {t('shipping.of', 'of')}{' '}
          {groups.length} {t('shipping.locations', 'locations')}
        </span>
        <span>
          {t('shipping.totalJobs', 'Total:')} {groups.reduce((sum, g) => sum + g.jobs.length, 0)}{' '}
          {t('shipping.jobs', 'jobs')} | {groups.reduce((sum, g) => sum + g.total_weight, 0).toFixed(1)} kg
        </span>
      </div>
    </div>
  );
}
