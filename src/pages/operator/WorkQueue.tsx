import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOperationsWithDetails,
  type OperationWithDetails,
} from "@/lib/database";
import OperationCard from "@/components/operator/OperationCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Filter, ListFilter, Clock3, CheckCircle2, UserCheck, PackageSearch } from "lucide-react";
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
import {
  OperatorEmptyState,
  OperatorPageHeader,
  OperatorPanel,
  OperatorStatCard,
  OperatorStatusChip,
} from "@/components/operator/OperatorStation";

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
  const { profile } = useAuth();
  const { activeOperator } = useOperator();
  const [operations, setOperations] = useState<OperationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [selectedCell, setSelectedCell] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cells, setCells] = useState<CellOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignedToMe, setAssignedToMe] = useState<boolean>(false);
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("sequence");
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
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
                } => assignment.part_id !== null && assignment.assigned_by_user !== null,
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

  const materials = Array.from(
    new Set(operations.map((operation) => operation.part.material).filter(Boolean)),
  ).sort();

  const assignedPartIds = useMemo(
    () => new Set(myAssignments.map((assignment) => assignment.part_id)),
    [myAssignments],
  );

  const filteredOperations = operations.filter((operation) => {
    const matchesMaterial =
      selectedMaterial === "all" || operation.part.material === selectedMaterial;

    const matchesCell =
      selectedCell === "all" || operation.cell_id === selectedCell;

    const matchesSearch =
      searchQuery === "" ||
      operation.operation_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      operation.part.part_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      operation.part.job.job_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (operation.part.job.customer &&
        operation.part.job.customer.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || operation.status === statusFilter;
    const matchesCompleted = showCompleted || operation.status !== "completed";
    const matchesAssigned =
      !assignedToMe ||
      operation.assigned_operator_id === profile?.id ||
      assignedPartIds.has(operation.part.id);

    let matchesDueDate = true;
    if (dueDateFilter !== "all") {
      const dueDate = new Date(
        operation.part.job.due_date_override || operation.part.job.due_date,
      );
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
      matchesCell &&
      matchesSearch &&
      matchesStatus &&
      matchesCompleted &&
      matchesAssigned &&
      matchesDueDate
    );
  });

  const sortedOperations = [...filteredOperations].sort((a, b) => {
    if (sortBy === "sequence") {
      return a.sequence - b.sequence;
    }
    if (sortBy === "due_date") {
      const dateA = new Date(a.part.job.due_date_override || a.part.job.due_date);
      const dateB = new Date(b.part.job.due_date_override || b.part.job.due_date);
      return dateA.getTime() - dateB.getTime();
    }
    if (sortBy === "estimated_time") {
      return (a.estimated_time || 0) - (b.estimated_time || 0);
    }
    return 0;
  });

  const assignmentsByPartId = useMemo(() => {
    const map = new Map<string, PartAssignment>();
    myAssignments.forEach((assignment) => map.set(assignment.part_id, assignment));
    return map;
  }, [myAssignments]);

  const operationsByCell = (selectedCell === "all"
    ? cells
    : cells.filter((cell) => cell.id === selectedCell)
  ).map((cell) => ({
    cell,
    operations: sortedOperations.filter((operation) => operation.cell_id === cell.id),
  }));

  const totalOperations = filteredOperations.length;
  const inProgressOperations = filteredOperations.filter(
    (operation) => operation.status === "in_progress",
  ).length;
  const completedOperations = filteredOperations.filter(
    (operation) => operation.status === "completed",
  ).length;
  const assignedOperations = filteredOperations.filter((operation) =>
    assignedPartIds.has(operation.part.id),
  ).length;

  if (loading) {
    return (
      <OperatorPanel className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {t("workQueue.loading", "Loading work queue")}
          </p>
        </div>
      </OperatorPanel>
    );
  }

  return (
    <div className="space-y-4">
      <OperatorPageHeader
        eyebrow={t("navigation.workQueue")}
        title={t("workQueue.title", "Work queue")}
        description={t(
          "workQueue.description",
          "Use the queue to scan work by cell, narrow it to what matters now, and open a packet only when the operator needs deeper detail.",
        )}
        meta={
          <>
            <OperatorStatusChip
              tone="info"
              label={`${cells.length} ${t("workQueue.cells", "cells")}`}
            />
            {assignedOperations > 0 ? (
              <OperatorStatusChip
                icon={UserCheck}
                tone="active"
                label={`${assignedOperations} ${t("operations.assignedToYou", "assigned to you")}`}
              />
            ) : null}
          </>
        }
        actions={
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters((prev) => !prev)}
            className="min-h-11 rounded-xl"
          >
            <Filter className="mr-2 h-4 w-4" />
            {showFilters
              ? t("common.hideFilters", "Hide filters")
              : t("common.showFilters", "Show filters")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OperatorStatCard
          label={t("workQueue.totalOperations", "Total operations")}
          value={totalOperations}
          caption={t("workQueue.visibleInCurrentView", "Visible in current view")}
          icon={ListFilter}
        />
        <OperatorStatCard
          label={t("workQueue.inProgress", "In progress")}
          value={inProgressOperations}
          caption={t("workQueue.clockedOrRunning", "Clocked or currently running")}
          icon={Clock3}
          tone="warning"
        />
        <OperatorStatCard
          label={t("workQueue.completed", "Completed")}
          value={completedOperations}
          caption={t("workQueue.finishedInCurrentFilter", "Finished in current filter")}
          icon={CheckCircle2}
          tone="success"
        />
        <OperatorStatCard
          label={t("workQueue.assigned", "Assigned")}
          value={assignedOperations}
          caption={t("workQueue.partsAssignedToOperator", "Parts assigned to the active operator")}
          icon={UserCheck}
          tone="active"
        />
      </div>

      <OperatorPanel className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t(
                "workQueue.searchPlaceholder",
                "Search by job, part, operation, or customer",
              )}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="min-h-11 rounded-xl border-border/80 pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="min-h-11 w-full rounded-xl border-border/80 bg-card lg:w-[220px]">
              <SelectValue placeholder={t("workQueue.sortBy", "Sort by")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sequence">{t("workQueue.sequence", "Sequence")}</SelectItem>
              <SelectItem value="due_date">{t("workQueue.dueDate", "Due date")}</SelectItem>
              <SelectItem value="estimated_time">
                {t("workQueue.estimatedTime", "Estimated time")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={selectedMaterial} onValueChange={setSelectedMaterial}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/30 p-1">
            <TabsTrigger value="all" className="min-h-11 rounded-xl">
              {t("workQueue.allMaterials", "All materials")}
            </TabsTrigger>
            {materials.map((material) => (
              <TabsTrigger key={material} value={material} className="min-h-11 rounded-xl">
                {material}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Tabs value={selectedCell} onValueChange={setSelectedCell}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/30 p-1">
            <TabsTrigger value="all" className="min-h-11 rounded-xl">
              {t("workQueue.allCells", "All cells")}
            </TabsTrigger>
            {cells.map((cell) => (
              <TabsTrigger key={cell.id} value={cell.id} className="min-h-11 rounded-xl">
                <span
                  className="mr-2 h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: cell.color || "currentColor" }}
                />
                {cell.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {showFilters ? (
          <div className="grid gap-4 rounded-2xl border border-border bg-muted/20 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">{t("workQueue.status", "Status")}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" className="min-h-11 rounded-xl">
                  <SelectValue placeholder={t("workQueue.allStatuses", "All statuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("workQueue.allStatuses", "All statuses")}</SelectItem>
                  <SelectItem value="not_started">{t("workQueue.notStarted", "Not started")}</SelectItem>
                  <SelectItem value="in_progress">{t("workQueue.inProgress", "In progress")}</SelectItem>
                  <SelectItem value="completed">{t("workQueue.completed", "Completed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due-date-filter">{t("workQueue.dueDate", "Due date")}</Label>
              <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                <SelectTrigger id="due-date-filter" className="min-h-11 rounded-xl">
                  <SelectValue placeholder={t("workQueue.allDates", "All dates")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("workQueue.allDates", "All dates")}</SelectItem>
                  <SelectItem value="overdue">{t("workQueue.overdue", "Overdue")}</SelectItem>
                  <SelectItem value="today">{t("workQueue.dueToday", "Due today")}</SelectItem>
                  <SelectItem value="this_week">{t("workQueue.thisWeek", "This week")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background/70 px-4 py-3">
              <Label htmlFor="assigned-to-me" className="text-sm font-medium">
                {t("workQueue.assignedToMe", "Assigned to me")}
              </Label>
              <Switch
                id="assigned-to-me"
                checked={assignedToMe}
                onCheckedChange={setAssignedToMe}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background/70 px-4 py-3">
              <Label htmlFor="show-completed" className="text-sm font-medium">
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
      </OperatorPanel>

      {sortedOperations.length === 0 ? (
        <OperatorEmptyState
          icon={PackageSearch}
          title={t("workQueue.noOperations", "No operations match this view")}
          description={t(
            "workQueue.noOperationsDescription",
            "Adjust the cell, material, or date filters to widen the queue.",
          )}
        />
      ) : (
        <div className="space-y-4">
          {operationsByCell.map(({ cell, operations: cellOperations }) => (
            <OperatorPanel key={cell.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cell.color || "currentColor" }}
                  />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{cell.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {cellOperations.length}{" "}
                      {cellOperations.length === 1
                        ? t("workQueue.operation", "operation")
                        : t("workQueue.operations", "operations")}
                    </p>
                  </div>
                </div>
                <OperatorStatusChip
                  tone="neutral"
                  label={`${cellOperations.filter((operation) => operation.status === "in_progress").length} ${t("workQueue.inProgress", "in progress")}`}
                />
              </div>

              {cellOperations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {t("workQueue.noOperationsInCell", "No operations in this cell for the current filters.")}
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                  {cellOperations.map((operation) => {
                    const assignment = assignmentsByPartId.get(operation.part.id);
                    return (
                      <OperationCard
                        key={operation.id}
                        operation={operation}
                        onUpdate={() => void loadData()}
                        assignedToMe={Boolean(assignment)}
                        assignedByName={assignment?.assigned_by_name}
                      />
                    );
                  })}
                </div>
              )}
            </OperatorPanel>
          ))}
        </div>
      )}
    </div>
  );
}
