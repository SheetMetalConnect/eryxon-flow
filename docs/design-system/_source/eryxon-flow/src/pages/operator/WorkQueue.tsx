import { useCallback, useEffect, useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useOperator } from "@/contexts/OperatorContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOperationsWithDetails,
  type OperationWithDetails,
} from "@/lib/database";
import OperationCard from "@/components/operator/OperationCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  Filter,
  PackageSearch,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  isAfter,
  isBefore,
  addDays,
  startOfToday,
  endOfToday,
} from "date-fns";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface PartAssignment {
  part_id: string;
  assigned_by_name: string;
}

interface CellOption {
  id: string;
  name: string;
  color: string | null;
}

export default function WorkQueue() {
  const { t } = useTranslation();
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const [operations, setOperations] = useState<OperationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cells, setCells] = useState<CellOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [assignedToMe, setAssignedToMe] = useState<boolean>(false);
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("sequence");
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [myAssignments, setMyAssignments] = useState<PartAssignment[]>([]);

  const loadData = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      const [operationsData, cellsData] = await Promise.all([
        fetchOperationsWithDetails(profile.tenant_id),
        supabase
          .from("cells")
          .select("id, name, color")
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true)
          .order("sequence"),
      ]);

      setOperations(operationsData);
      if (cellsData.data) setCells(cellsData.data);

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
              .filter(
                (assignment): assignment is {
                  part_id: string;
                  assigned_by_user: { full_name: string };
                } =>
                  assignment.part_id !== null &&
                  assignment.assigned_by_user !== null,
              )
              .map((assignment) => ({
                part_id: assignment.part_id,
                assigned_by_name: assignment.assigned_by_user.full_name,
              })),
          );
        }
      } else {
        setMyAssignments([]);
      }
    } catch (error) {
      logger.error("WorkQueue", "Error loading data", error);
      toast.error(t("workQueue.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [activeOperator?.id, profile?.tenant_id, t]);

  const setupRealtimeSubscriptions = useCallback(() => {
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
          void loadData();
        },
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
          void loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(operationsChannel);
      supabase.removeChannel(timeEntriesChannel);
    };
  }, [loadData, profile?.tenant_id]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    void loadData();
    return setupRealtimeSubscriptions();
  }, [loadData, profile?.tenant_id, setupRealtimeSubscriptions]);

  const assignedPartIds = useMemo(
    () => new Set(myAssignments.map((assignment) => assignment.part_id)),
    [myAssignments],
  );

  const filteredOperations = operations.filter((operation) => {
    const matchesSearch =
      searchQuery === "" ||
      operation.operation_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      operation.part.part_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      operation.part.job.job_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (operation.part.job.customer &&
        operation.part.job.customer
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && operation.status !== "completed") ||
      operation.status === statusFilter;
    const matchesCompleted = showCompleted || operation.status !== "completed";
    const matchesAssigned =
      !assignedToMe ||
      operation.assigned_operator_id === profile?.id ||
      assignedPartIds.has(operation.part.id);

    let matchesDueDate = true;
    if (dueDateFilter !== "all") {
      const dueDateValue =
        operation.part.job.due_date_override || operation.part.job.due_date;
      const dueDate = dueDateValue ? new Date(dueDateValue) : null;
      const hasValidDueDate =
        dueDate !== null && Number.isFinite(dueDate.getTime());

      if (hasValidDueDate) {
        const today = startOfToday();
        const endToday = endOfToday();
        const weekFromNow = addDays(today, 7);

        if (dueDateFilter === "overdue") {
          matchesDueDate = isBefore(dueDate, today);
        } else if (dueDateFilter === "today") {
          matchesDueDate =
            isAfter(dueDate, today) && isBefore(dueDate, endToday);
        } else if (dueDateFilter === "this_week") {
          matchesDueDate =
            isAfter(dueDate, today) && isBefore(dueDate, weekFromNow);
        }
      }
    }

    return (
      matchesSearch &&
      matchesStatus &&
      matchesCompleted &&
      matchesAssigned &&
      matchesDueDate
    );
  });

  const sortedOperations = [...filteredOperations].sort((a, b) => {
    // Always sort in_progress first within each group
    const statusOrder = (status: string) => {
      if (status === "in_progress") return 0;
      if (status === "not_started") return 1;
      if (status === "on_hold") return 2;
      return 3;
    };
    const statusDiff = statusOrder(a.status) - statusOrder(b.status);
    if (statusDiff !== 0) return statusDiff;

    if (sortBy === "sequence") {
      return a.sequence - b.sequence;
    }
    if (sortBy === "due_date") {
      const getDueTime = (operation: OperationWithDetails) => {
        const dueDateValue =
          operation.part.job.due_date_override || operation.part.job.due_date;
        if (!dueDateValue) return Number.MAX_SAFE_INTEGER;
        const dueDate = new Date(dueDateValue);
        return Number.isFinite(dueDate.getTime())
          ? dueDate.getTime()
          : Number.MAX_SAFE_INTEGER;
      };
      return getDueTime(a) - getDueTime(b);
    }
    if (sortBy === "estimated_time") {
      return (a.estimated_time || 0) - (b.estimated_time || 0);
    }
    return 0;
  });

  const assignmentsByPartId = useMemo(() => {
    const map = new Map<string, PartAssignment>();
    myAssignments.forEach((assignment) =>
      map.set(assignment.part_id, assignment),
    );
    return map;
  }, [myAssignments]);

  /* ── Kanban columns: one per cell ── */
  const kanbanColumns = cells.map((cell) => {
    const cellOps = sortedOperations.filter((op) => op.cell_id === cell.id);
    const inProgress = cellOps.filter((op) => op.status === "in_progress").length;
    const onHold = cellOps.filter((op) => op.status === "on_hold").length;
    const rushCount = cellOps.filter((op) => op.part?.is_bullet_card).length;
    const totalHours = cellOps.reduce((sum, op) => sum + Math.max(0, (op.estimated_time || 0) - (op.actual_time || 0)), 0);
    const totalPcs = cellOps.reduce((sum, op) => sum + (Number(op.part?.quantity) || 0), 0);
    return { cell, operations: cellOps, inProgress, onHold, rushCount, totalHours, totalPcs };
  });

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-160px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {t("workQueue.loading", "Loading work queue")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-160px)] flex-col overflow-hidden">
      {/* ── Compact filter bar ── */}
      <div className="shrink-0 border-b border-border bg-card/80 px-3 py-2 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t(
                "workQueue.searchPlaceholder",
                "Search job, part, operation...",
              )}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-8 rounded-md border-border/80 pl-8 text-sm"
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-[150px] rounded-md border-border/80 text-xs">
              <SelectValue
                placeholder={t("workQueue.sortBy", "Sort by")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sequence">
                {t("workQueue.sequence", "Sequence")}
              </SelectItem>
              <SelectItem value="due_date">
                {t("workQueue.dueDate", "Due date")}
              </SelectItem>
              <SelectItem value="estimated_time">
                {t("workQueue.estimatedTime", "Est. time")}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] rounded-md border-border/80 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">
                {t("workQueue.activeOnly", "Active only")}
              </SelectItem>
              <SelectItem value="all">
                {t("workQueue.allStatuses", "All statuses")}
              </SelectItem>
              <SelectItem value="not_started">
                {t("workQueue.notStarted", "Not started")}
              </SelectItem>
              <SelectItem value="in_progress">
                {t("workQueue.inProgress", "In progress")}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filter toggle */}
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters((prev) => !prev)}
            className="h-8 rounded-md text-xs"
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            {t("common.filters", "Filters")}
          </Button>

          {/* Summary */}
          <div className="hidden text-xs text-muted-foreground lg:block">
            {filteredOperations.length}{" "}
            {t("workQueue.operations", "operations")}
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border pt-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("workQueue.dueDate", "Due date")}
              </Label>
              <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                <SelectTrigger className="h-8 w-[130px] rounded-md text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("workQueue.allDates", "All dates")}
                  </SelectItem>
                  <SelectItem value="overdue">
                    {t("workQueue.overdue", "Overdue")}
                  </SelectItem>
                  <SelectItem value="today">
                    {t("workQueue.dueToday", "Due today")}
                  </SelectItem>
                  <SelectItem value="this_week">
                    {t("workQueue.thisWeek", "This week")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-background/70 px-3 py-1.5">
              <Label
                htmlFor="assigned-to-me"
                className="text-xs font-medium"
              >
                {t("workQueue.assignedToMe", "Assigned to me")}
              </Label>
              <Switch
                id="assigned-to-me"
                checked={assignedToMe}
                onCheckedChange={setAssignedToMe}
              />
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-background/70 px-3 py-1.5">
              <Label
                htmlFor="show-completed"
                className="text-xs font-medium"
              >
                {t("workQueue.showCompleted", "Show completed")}
              </Label>
              <Switch
                id="show-completed"
                checked={showCompleted}
                onCheckedChange={setShowCompleted}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Kanban board — horizontal scroll of columns ── */}
      <div className="flex min-h-0 flex-1 overflow-x-auto">
        {kanbanColumns.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <PackageSearch className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-sm font-medium text-foreground">
                {t("workQueue.noCells", "No cells configured")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t(
                  "workQueue.noCellsDescription",
                  "Add manufacturing cells in admin settings to see the kanban board.",
                )}
              </div>
            </div>
          </div>
        ) : (
          kanbanColumns.map(({ cell, operations: cellOps, inProgress, onHold, rushCount, totalHours, totalPcs }) => (
            <div
              key={cell.id}
              className="flex h-full w-[320px] shrink-0 flex-col border-r border-border last:border-r-0"
            >
              {/* Column header */}
              <div className="shrink-0 border-b border-border bg-muted/30 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: cell.color || "currentColor" }}
                    />
                    <span className="truncate text-sm font-semibold text-foreground">
                      {cell.name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {rushCount > 0 ? (
                      <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                        {rushCount} rush
                      </span>
                    ) : null}
                    {inProgress > 0 ? (
                      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        {inProgress} {t("workQueue.active", "active")}
                      </span>
                    ) : null}
                    {onHold > 0 ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {onHold} hold
                      </span>
                    ) : null}
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {cellOps.length}
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <span>{totalHours.toFixed(1)}h</span>
                  <span>·</span>
                  <span>{totalPcs} pcs</span>
                </div>
              </div>

              {/* Column body — scrollable cards */}
              <div className="flex-1 overflow-y-auto p-2">
                {cellOps.length === 0 ? (
                  <div className="flex h-full items-center justify-center p-4">
                    <div className="text-center text-xs text-muted-foreground">
                      {t(
                        "workQueue.emptyColumn",
                        "No operations",
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cellOps.map((operation) => {
                      const assignment = assignmentsByPartId.get(
                        operation.part.id,
                      );
                      return (
                        <OperationCard
                          key={operation.id}
                          operation={operation}
                          onUpdate={() => void loadData()}
                          compact
                          assignedToMe={Boolean(assignment)}
                          assignedByName={assignment?.assigned_by_name}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
