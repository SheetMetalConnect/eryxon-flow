import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchOperationsWithDetails, OperationWithDetails } from "@/lib/database";
import OperationCard from "@/components/operator/OperationCard";
import BatchCard from "@/components/operator/BatchCard";
import QuickBatchModal from "@/components/operator/QuickBatchModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Filter, Eye, EyeOff, LayoutGrid, List, UserCheck, Layers, Plus } from "lucide-react";
import { toast } from "sonner";
import type { BatchWithOperations } from "@/types/batches";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { isAfter, isBefore, addDays, startOfToday, endOfToday } from "date-fns";
import { useTranslation } from "react-i18next";

// Operator assignment info for parts
interface PartAssignment {
  part_id: string;
  assigned_by_name: string;
}

const getStageClass = (cellName: string) => {
  const name = cellName.toLowerCase();
  if (name.includes('cut')) return 'stage-cutting';
  if (name.includes('bend')) return 'stage-bending';
  if (name.includes('weld')) return 'stage-welding';
  if (name.includes('assembl')) return 'stage-assembly';
  if (name.includes('finish')) return 'stage-finishing';
  return 'muted';
};

export default function WorkQueue() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { activeOperator } = useOperator();
  const [operations, setOperations] = useState<OperationWithDetails[]>([]);
  const [batches, setBatches] = useState<BatchWithOperations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cells, setCells] = useState<any[]>([]);
  const [hiddenCells, setHiddenCells] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignedToMe, setAssignedToMe] = useState<boolean>(false);
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("sequence");
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [myAssignments, setMyAssignments] = useState<PartAssignment[]>([]);
  const [showBatches, setShowBatches] = useState<boolean>(true);
  const [quickBatchCell, setQuickBatchCell] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    loadData();
    return setupRealtimeSubscriptions();
  }, [profile?.tenant_id, activeOperator?.id]);

  const loadData = async () => {
    if (!profile?.tenant_id) return;

    try {
      const [operationsData, cellsData, batchesData] = await Promise.all([
        fetchOperationsWithDetails(profile.tenant_id),
        supabase
          .from("cells")
          .select("*")
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true)
          .order("sequence"),
        supabase
          .from("operation_batches")
          .select(`
            *,
            batch_operations (
              id,
              operation_id,
              sequence_in_batch,
              operation:operations (
                id,
                operation_name,
                status,
                estimated_time,
                part:parts (
                  id,
                  part_number,
                  material,
                  quantity,
                  job:jobs (
                    id,
                    job_number,
                    customer,
                    due_date
                  )
                )
              )
            )
          `)
          .eq("tenant_id", profile.tenant_id)
          .in("status", ["draft", "ready", "in_progress"])
          .order("created_at", { ascending: false }),
      ]);

      setOperations(operationsData);
      if (cellsData.data) setCells(cellsData.data);
      if (batchesData.data) setBatches(batchesData.data as BatchWithOperations[]);

      // Load assignments for the active shop floor operator
      if (activeOperator?.id) {
        const { data: assignmentsData } = await supabase
          .from("assignments")
          .select(`
            part_id,
            assigned_by_user:profiles!assignments_assigned_by_fkey(full_name)
          `)
          .eq("tenant_id", profile.tenant_id)
          .eq("shop_floor_operator_id", activeOperator.id)
          .eq("status", "assigned");

        if (assignmentsData) {
          setMyAssignments(
            assignmentsData
              .filter((a): a is { part_id: string; assigned_by_user: { full_name: string } } =>
                a.part_id !== null && a.assigned_by_user !== null)
              .map(a => ({
                part_id: a.part_id,
                assigned_by_name: a.assigned_by_user.full_name,
              }))
          );
        }
      } else {
        setMyAssignments([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load work queue");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!profile?.tenant_id) return;

    const operationsChannel = supabase
      .channel("operations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    const timeEntriesChannel = supabase
      .channel("time-entries-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    const batchesChannel = supabase
      .channel("batches-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operation_batches",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(operationsChannel);
      supabase.removeChannel(timeEntriesChannel);
      supabase.removeChannel(batchesChannel);
    };
  };

  const toggleCellVisibility = (cellId: string) => {
    setHiddenCells((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cellId)) {
        newSet.delete(cellId);
      } else {
        newSet.add(cellId);
      }
      return newSet;
    });
  };

  // Get unique materials
  const materials = Array.from(
    new Set(operations.map((operation) => operation.part.material))
  ).sort();

  // Filter operations
  const filteredOperations = operations.filter((operation) => {
    // Material filter
    const matchesMaterial =
      selectedMaterial === "all" || operation.part.material === selectedMaterial;

    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      operation.operation_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      operation.part.part_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      operation.part.job.job_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (operation.part.job.customer &&
        operation.part.job.customer.toLowerCase().includes(searchQuery.toLowerCase()));

    // Status filter
    const matchesStatus =
      statusFilter === "all" || operation.status === statusFilter;

    // Show completed filter
    const matchesCompleted = showCompleted || operation.status !== "completed";

    // Assigned to me filter
    const matchesAssigned =
      !assignedToMe || operation.assigned_operator_id === profile?.id;

    // Due date filter
    let matchesDueDate = true;
    if (dueDateFilter !== "all") {
      const dueDate = new Date(operation.part.job.due_date_override || operation.part.job.due_date);
      const today = startOfToday();
      const endToday = endOfToday();
      const weekFromNow = addDays(today, 7);

      if (dueDateFilter === "overdue") {
        matchesDueDate = isBefore(dueDate, today);
      } else if (dueDateFilter === "today") {
        matchesDueDate = isAfter(dueDate, today) && isBefore(dueDate, endToday);
      } else if (dueDateFilter === "this_week") {
        matchesDueDate = isAfter(dueDate, today) && isBefore(dueDate, weekFromNow);
      }
    }

    return (
      matchesMaterial &&
      matchesSearch &&
      matchesStatus &&
      matchesCompleted &&
      matchesAssigned &&
      matchesDueDate
    );
  });

  // Sort operations
  const sortedOperations = [...filteredOperations].sort((a, b) => {
    if (sortBy === "sequence") {
      return a.sequence - b.sequence;
    } else if (sortBy === "due_date") {
      const dateA = new Date(a.part.job.due_date_override || a.part.job.due_date);
      const dateB = new Date(b.part.job.due_date_override || b.part.job.due_date);
      return dateA.getTime() - dateB.getTime();
    } else if (sortBy === "estimated_time") {
      return (a.estimated_time || 0) - (b.estimated_time || 0);
    }
    return 0;
  });

  // Create a map of part_id -> assignment info for quick lookup
  const assignmentsByPartId = useMemo(() => {
    const map = new Map<string, PartAssignment>();
    myAssignments.forEach(a => map.set(a.part_id, a));
    return map;
  }, [myAssignments]);

  // Get IDs of operations that are in batches (to exclude from individual listing)
  const operationIdsInBatches = useMemo(() => {
    const ids = new Set<string>();
    batches.forEach((batch) => {
      batch.batch_operations?.forEach((bo: any) => {
        if (bo.operation_id) ids.add(bo.operation_id);
      });
    });
    return ids;
  }, [batches]);

  // Group operations and batches by cell
  const operationsByCell = cells
    .filter((cell) => !hiddenCells.has(cell.id))
    .map((cell) => ({
      cell,
      // Filter out operations that are in batches when showing batches
      operations: sortedOperations.filter(
        (operation) =>
          operation.cell_id === cell.id &&
          (!showBatches || !operationIdsInBatches.has(operation.id))
      ),
      batches: showBatches
        ? batches.filter((batch) => batch.cell_id === cell.id)
        : [],
    }));

  // Calculate stats
  const totalOperations = filteredOperations.length;
  const inProgressOperations = filteredOperations.filter((o) => o.status === "in_progress").length;
  const completedOperations = filteredOperations.filter((o) => o.status === "completed").length;
  const activeBatches = batches.filter((b) => b.status === "in_progress").length;
  const totalBatches = batches.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Stats Card */}
        <Card className="glass-card p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Operations</p>
              <p className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {totalOperations}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {inProgressOperations}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold text-status-completed">
                {completedOperations}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Not Started</p>
              <p className="text-3xl font-bold text-muted-foreground">
                {totalOperations - inProgressOperations - completedOperations}
              </p>
            </div>
            {totalBatches > 0 && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {t("batches.batches")}
                </p>
                <p className="text-3xl font-bold text-brand-primary">
                  {activeBatches}<span className="text-lg text-muted-foreground">/{totalBatches}</span>
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Search and Material Filter */}
        <div className="glass-card rounded-lg p-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by job, part, operation, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === "detailed" ? "compact" : "detailed")}
            >
              {viewMode === "detailed" ? (
                <LayoutGrid className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Material Tabs */}
          <Tabs value={selectedMaterial} onValueChange={setSelectedMaterial}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">All Materials</TabsTrigger>
              {materials.map((material) => (
                <TabsTrigger key={material} value={material}>
                  {material}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due-date-filter">Due Date</Label>
                <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                  <SelectTrigger id="due-date-filter">
                    <SelectValue placeholder="All Dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="today">Due Today</SelectItem>
                    <SelectItem value="this_week">Due This Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sort-by">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sort-by">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequence">Sequence</SelectItem>
                    <SelectItem value="due_date">Due Date</SelectItem>
                    <SelectItem value="estimated_time">Estimated Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="assigned-to-me"
                  checked={assignedToMe}
                  onCheckedChange={setAssignedToMe}
                />
                <Label htmlFor="assigned-to-me">Assigned to Me</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-completed"
                  checked={showCompleted}
                  onCheckedChange={setShowCompleted}
                />
                <Label htmlFor="show-completed">Show Completed</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-batches"
                  checked={showBatches}
                  onCheckedChange={setShowBatches}
                />
                <Label htmlFor="show-batches" className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {t("batches.batches")}
                </Label>
              </div>
            </div>
          )}

          {/* Cell Visibility Toggles */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground">Cells:</span>
            {cells.map((cell) => (
              <Button
                key={cell.id}
                variant={hiddenCells.has(cell.id) ? "outline" : "default"}
                size="sm"
                onClick={() => toggleCellVisibility(cell.id)}
                className={`
                  ${hiddenCells.has(cell.id) ? "bg-transparent" : `bg-${getStageClass(cell.name)}`}
                  border-${getStageClass(cell.name)}
                `}
              >
                {hiddenCells.has(cell.id) ? (
                  <EyeOff className="h-3 w-3 mr-1" />
                ) : (
                  <Eye className="h-3 w-3 mr-1" />
                )}
                {cell.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
            {operationsByCell.map(({ cell, operations, batches: cellBatches }) => (
              <div
                key={cell.id}
                className={`flex-shrink-0 ${viewMode === "detailed" ? "w-80" : "w-64"
                  } bg-card rounded-lg border`}
              >
                <div
                  className={`p-4 border-b border-t-4 border-t-${getStageClass(cell.name)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-lg">{cell.name}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setQuickBatchCell({ id: cell.id, name: cell.name })}
                      title={t("batches.createBatch")}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{operations.length} operation{operations.length !== 1 ? "s" : ""}</span>
                    {cellBatches.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-brand-primary">
                          <Layers className="h-3 w-3" />
                          {cellBatches.length} {t("batches.batch").toLowerCase()}{cellBatches.length !== 1 ? "es" : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
                  {/* Batches Section */}
                  {cellBatches.length > 0 && (
                    <div className="space-y-3">
                      {cellBatches.map((batch) => (
                        <BatchCard
                          key={batch.id}
                          batch={batch}
                          onUpdate={loadData}
                          compact={viewMode === "compact"}
                        />
                      ))}
                      {operations.length > 0 && (
                        <div className="relative py-2">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border/50" />
                          </div>
                          <div className="relative flex justify-center">
                            <span className="bg-card px-2 text-xs text-muted-foreground">
                              {t("operations.title")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Individual Operations */}
                  {operations.length === 0 && cellBatches.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No operations
                    </div>
                  ) : (
                    operations.map((operation) => {
                      const assignment = assignmentsByPartId.get(operation.part.id);
                      return (
                        <OperationCard
                          key={operation.id}
                          operation={operation}
                          onUpdate={loadData}
                          compact={viewMode === "compact"}
                          assignedToMe={!!assignment}
                          assignedByName={assignment?.assigned_by_name}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Batch Creation Modal */}
      <QuickBatchModal
        open={!!quickBatchCell}
        onClose={() => setQuickBatchCell(null)}
        cellId={quickBatchCell?.id}
        cellName={quickBatchCell?.name}
        onSuccess={loadData}
      />
    </>
  );
}
