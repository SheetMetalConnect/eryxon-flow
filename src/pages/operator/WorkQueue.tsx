import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import OperationCard from "@/components/operator/OperationCard";
import CurrentlyTimingWidget from "@/components/operator/CurrentlyTimingWidget";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Filter, Eye, EyeOff, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
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
import { isAfter, isBefore, addDays, startOfToday, endOfToday } from "date-fns";

interface OperationWithDetails {
  id: string;
  operation_name: string;
  status: string;
  part: {
    part_number: string;
    material: string;
    job: {
      job_number: string;
      due_date: string;
      customer: string;
    };
  };
  cell: {
    name: string;
    color: string;
  };
}

export default function WorkQueue() {
  const { profile } = useAuth();
  const [operations, setOperations] = useState<OperationWithDetails[]>([]);
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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    if (!profile?.tenant_id) return;

    loadData();
    setupRealtimeSubscriptions();
  }, [profile?.tenant_id]);

  const loadData = async () => {
    if (!profile?.tenant_id) return;

    try {
      const [operationsData, cellsData] = await Promise.all([
        supabase
          .from("operations")
          .select(`
            *,
            part:parts!inner(
              part_number,
              material,
              job:jobs!inner(job_number, due_date, customer)
            ),
            cell:cells!inner(name, color)
          `)
          .eq("tenant_id", profile.tenant_id)
          .order("part(job(due_date))"),
        supabase
          .from("cells")
          .select("*")
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true)
          .order("sequence"),
      ]);

      if (operationsData.data) setOperations(operationsData.data);
      if (cellsData.data) setCells(cellsData.data);
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

    return () => {
      supabase.removeChannel(operationsChannel);
      supabase.removeChannel(timeEntriesChannel);
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
      const dueDate = new Date(operation.part.job.due_date);
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
      return (a.sequence || 0) - (b.sequence || 0);
    } else if (sortBy === "due_date") {
      const dateA = new Date(a.part.job.due_date);
      const dateB = new Date(b.part.job.due_date);
      return dateA.getTime() - dateB.getTime();
    } else if (sortBy === "estimated_time") {
      return (a.estimated_time || 0) - (b.estimated_time || 0);
    }
    return 0;
  });

  // Group operations by cell
  const operationsByCell = cells
    .filter((cell) => !hiddenCells.has(cell.id))
    .map((cell) => ({
      cell,
      operations: sortedOperations.filter((operation) => operation.cell_id === cell.id),
    }));

  // Calculate stats
  const totalOperations = filteredOperations.length;
  const inProgressOperations = filteredOperations.filter((op) => op.status === "in_progress").length;
  const completedOperations = filteredOperations.filter((op) => op.status === "completed").length;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Collapsible Side Panel */}
        <div
          className={`transition-all duration-300 ease-in-out border-r bg-card ${
            sidebarOpen ? "w-80" : "w-0"
          } overflow-hidden`}
        >
          <div className="w-80 h-full flex flex-col">
            {/* Side Panel Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters & Controls</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* Side Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Stats Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-bold">{totalOperations}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                    <span className="text-sm text-muted-foreground">In Progress</span>
                    <span className="text-lg font-bold text-blue-600">{inProgressOperations}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <span className="text-lg font-bold text-green-600">{completedOperations}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                    <span className="text-sm text-muted-foreground">Not Started</span>
                    <span className="text-lg font-bold text-gray-600">
                      {totalOperations - inProgressOperations - completedOperations}
                    </span>
                  </div>
                </div>
              </div>

              {/* Material Filter */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Materials
                </h3>
                <Tabs value={selectedMaterial} onValueChange={setSelectedMaterial}>
                  <TabsList className="w-full flex-col h-auto">
                    <TabsTrigger value="all" className="w-full justify-start">
                      All Materials
                    </TabsTrigger>
                    {materials.map((material) => (
                      <TabsTrigger key={material} value={material} className="w-full justify-start">
                        {material}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {/* Status Filter */}
              <div>
                <Label htmlFor="status-filter" className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter" className="mt-2">
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

              {/* Due Date Filter */}
              <div>
                <Label htmlFor="due-date-filter" className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Due Date
                </Label>
                <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                  <SelectTrigger id="due-date-filter" className="mt-2">
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

              {/* Sort By */}
              <div>
                <Label htmlFor="sort-by" className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Sort By
                </Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sort-by" className="mt-2">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequence">Sequence</SelectItem>
                    <SelectItem value="due_date">Due Date</SelectItem>
                    <SelectItem value="estimated_time">Estimated Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle Switches */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="assigned-to-me" className="text-sm font-medium cursor-pointer">
                    Assigned to Me
                  </Label>
                  <Switch
                    id="assigned-to-me"
                    checked={assignedToMe}
                    onCheckedChange={setAssignedToMe}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-completed" className="text-sm font-medium cursor-pointer">
                    Show Completed
                  </Label>
                  <Switch
                    id="show-completed"
                    checked={showCompleted}
                    onCheckedChange={setShowCompleted}
                  />
                </div>
              </div>

              {/* Cell Visibility */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Cell Visibility
                </h3>
                <div className="space-y-2">
                  {cells.map((cell) => (
                    <Button
                      key={cell.id}
                      variant={hiddenCells.has(cell.id) ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleCellVisibility(cell.id)}
                      className="w-full justify-start"
                      style={{
                        backgroundColor: hiddenCells.has(cell.id)
                          ? "transparent"
                          : cell.color,
                        borderColor: cell.color,
                      }}
                    >
                      {hiddenCells.has(cell.id) ? (
                        <EyeOff className="h-4 w-4 mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      {cell.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="p-4 border-b bg-background space-y-4">
            {/* Currently Timing Widget */}
            <CurrentlyTimingWidget />

            {/* Search and Controls */}
            <div className="flex gap-2">
              {!sidebarOpen && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
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
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === "detailed" ? "compact" : "detailed")}
                title={viewMode === "detailed" ? "Switch to compact view" : "Switch to detailed view"}
              >
                {viewMode === "detailed" ? (
                  <LayoutGrid className="h-4 w-4" />
                ) : (
                  <List className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
            <div className="flex gap-4 h-full" style={{ minWidth: "max-content" }}>
              {operationsByCell.map(({ cell, operations }) => (
                <div
                  key={cell.id}
                  className={`flex-shrink-0 ${
                    viewMode === "detailed" ? "w-80" : "w-64"
                  } bg-card rounded-lg border flex flex-col`}
                >
                  <div
                    className="p-4 border-b"
                    style={{
                      borderTopColor: cell.color || "hsl(var(--primary))",
                      borderTopWidth: "4px",
                    }}
                  >
                    <h3 className="font-semibold text-lg">{cell.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {operations.length} operation{operations.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {operations.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No operations
                      </div>
                    ) : (
                      operations.map((operation) => (
                        <OperationCard
                          key={operation.id}
                          operation={operation}
                          onUpdate={loadData}
                          compact={viewMode === "compact"}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
