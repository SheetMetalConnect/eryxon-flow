"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useOperator } from "../../contexts/OperatorContext";
import { supabase } from "../../integrations/supabase/client";
import {
  startTimeTracking,
  stopTimeTracking,
  completeOperation,
} from "../../lib/database";
import { format } from "date-fns";
import { PDFViewer } from "../../components/PDFViewer";
import { STEPViewer } from "../../components/STEPViewer";
import SubstepsManager from "../../components/operator/SubstepsManager";
import ProductionQuantityModal from "../../components/operator/ProductionQuantityModal";
import IssueForm from "../../components/operator/IssueForm";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  Play,
  Square,
  CheckCircle,
  Calendar,
  Clock,
  Wrench,
  FileText,
  Box as BoxIcon,
  Maximize2,
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ClipboardList,
  AlertTriangle,
  Info,
} from "lucide-react";

interface Job {
  id: string;
  job_number: string;
  customer: string | null;
  status: string;
  due_date: string;
  due_date_override: string | null;
  current_cell_id: string | null;
}

interface Part {
  id: string;
  part_number: string;
  material: string;
  quantity: number;
  status: string;
  file_paths: string[] | null;
  image_paths: string[] | null;
}

interface Cell {
  id: string;
  name: string;
  color: string;
}

interface Operation {
  id: string;
  operation_name: string;
  sequence: number;
  estimated_time: number;
  actual_time: number;
  status: string;
  notes: string | null;
  assigned_operator_id: string | null;
  cell_id: string;
  part_id: string;
  part: Part;
  cell: Cell;
  active_time_entry?: {
    id: string;
    start_time: string;
    operator_id: string;
  } | null;
}

export default function OperatorView() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTimeEntry, setActiveTimeEntry] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [stepUrl, setStepUrl] = useState<string | null>(null);
  const [viewerTab, setViewerTab] = useState<string>("pdf");
  const [fullscreenViewer, setFullscreenViewer] = useState<"pdf" | "3d" | null>(null);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState<boolean>(false);
  const [isIssueFormOpen, setIsIssueFormOpen] = useState<boolean>(false);
  const [issuePrefilledData, setIssuePrefilledData] = useState<{ affectedQuantity?: number; isShortfall?: boolean } | null>(null);

  // Panel collapse states
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);

  // Resizable panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(55);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load jobs
  useEffect(() => {
    loadJobs();
  }, [profile]);

  // Load operations when job is selected
  useEffect(() => {
    if (selectedJobId) {
      loadOperations(selectedJobId);
    } else {
      setOperations([]);
      setSelectedOperation(null);
    }
  }, [selectedJobId]);

  // Update elapsed time for active time entry
  useEffect(() => {
    if (activeTimeEntry?.start_time) {
      const interval = setInterval(() => {
        const start = new Date(activeTimeEntry.start_time);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedSeconds(diffInSeconds);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [activeTimeEntry]);

  // Load file URLs when operation is selected
  useEffect(() => {
    if (selectedOperation?.part?.file_paths) {
      loadFileUrls(selectedOperation.part.file_paths);
    } else {
      setPdfUrl(null);
      setStepUrl(null);
    }
  }, [selectedOperation]);

  // Auto-select viewer tab based on available files
  useEffect(() => {
    if (pdfUrl && !stepUrl) setViewerTab("pdf");
    else if (stepUrl && !pdfUrl) setViewerTab("3d");
    else if (pdfUrl) setViewerTab("pdf");
  }, [pdfUrl, stepUrl]);

  // Subscribe to time entry changes
  useEffect(() => {
    if (!selectedOperation) return;

    const channel = supabase
      .channel("time-entries-operator-view")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `operation_id=eq.${selectedOperation.id}`,
        },
        () => {
          loadOperations(selectedJobId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedOperation, selectedJobId]);

  // Resizable panel handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.min(75, Math.max(25, newWidth)));
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle touch events for tablet
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const touch = e.touches[0];
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((touch.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.min(75, Math.max(25, newWidth)));
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .in("status", ["not_started", "in_progress"])
        .order("due_date", { ascending: true });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Error loading jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOperations = async (jobId: string) => {
    try {
      const { data: parts, error: partsError } = await supabase
        .from("parts")
        .select("id")
        .eq("job_id", jobId)
        .eq("tenant_id", profile.tenant_id);

      if (partsError) throw partsError;

      const partIds = parts?.map((p) => p.id) || [];

      if (partIds.length === 0) {
        setOperations([]);
        return;
      }

      const { data, error } = await supabase
        .from("operations")
        .select(`*, part:parts(*), cell:cells(*)`)
        .in("part_id", partIds)
        .eq("tenant_id", profile.tenant_id)
        .order("sequence", { ascending: true });

      if (error) throw error;

      const operationIds = data?.map((op) => op.id) || [];
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("*")
        .in("operation_id", operationIds)
        .is("end_time", null);

      const operationsWithTimeEntries = data?.map((op) => ({
        ...op,
        active_time_entry: timeEntries?.find((te) => te.operation_id === op.id),
      }));

      setOperations(operationsWithTimeEntries || []);

      if (!selectedOperation && operationsWithTimeEntries && operationsWithTimeEntries.length > 0) {
        const firstIncomplete =
          operationsWithTimeEntries.find((op) => op.status !== "completed") ||
          operationsWithTimeEntries[0];
        setSelectedOperation(firstIncomplete);
        setActiveTimeEntry(firstIncomplete.active_time_entry || null);
      } else if (selectedOperation) {
        const updated = operationsWithTimeEntries?.find((op) => op.id === selectedOperation.id);
        if (updated) {
          setSelectedOperation(updated);
          setActiveTimeEntry(updated.active_time_entry || null);
        }
      }
    } catch (error) {
      console.error("Error loading operations:", error);
    }
  };

  const loadFileUrls = async (filePaths: string[]) => {
    try {
      let pdf: string | null = null;
      let step: string | null = null;

      for (const path of filePaths) {
        const ext = path.toLowerCase();
        if (ext.endsWith(".pdf") && !pdf) {
          const { data } = await supabase.storage.from("files").createSignedUrl(path, 3600);
          if (data?.signedUrl) pdf = data.signedUrl;
        } else if ((ext.endsWith(".step") || ext.endsWith(".stp")) && !step) {
          const { data } = await supabase.storage.from("files").createSignedUrl(path, 3600);
          if (data?.signedUrl) {
            const response = await fetch(data.signedUrl);
            const blob = await response.blob();
            step = URL.createObjectURL(blob);
          }
        }
      }

      setPdfUrl(pdf);
      setStepUrl(step);
    } catch (error) {
      console.error("Error loading file URLs:", error);
    }
  };

  const handleStartTracking = async () => {
    if (!selectedOperation || !operatorId || !profile?.tenant_id) return;

    try {
      await startTimeTracking(selectedOperation.id, operatorId, profile.tenant_id);
      await loadOperations(selectedJobId);
    } catch (error: any) {
      console.error("Error starting time tracking:", error);
      alert(error.message || "Failed to start time tracking");
    }
  };

  const handleStopTracking = async () => {
    if (!selectedOperation || !operatorId || !activeTimeEntry) return;

    try {
      await stopTimeTracking(selectedOperation.id, operatorId);
      await loadOperations(selectedJobId);
    } catch (error) {
      console.error("Error stopping time tracking:", error);
    }
  };

  const handleCompleteOperation = async () => {
    if (!selectedOperation || !operatorId || !profile?.tenant_id) return;

    if (activeTimeEntry) {
      alert("Please stop time tracking before completing the operation");
      return;
    }

    try {
      await completeOperation(selectedOperation.id, profile.tenant_id, operatorId);
      await loadOperations(selectedJobId);
    } catch (error) {
      console.error("Error completing operation:", error);
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const selectedJob = useMemo(() => {
    return jobs.find((j) => j.id === selectedJobId);
  }, [jobs, selectedJobId]);

  const dueDate = selectedJob
    ? new Date(selectedJob.due_date_override || selectedJob.due_date)
    : null;
  const isOverdue = dueDate && dueDate < new Date();

  const completedOps = operations.filter((op) => op.status === "completed").length;
  const totalOps = operations.length;
  const progressPercent = totalOps > 0 ? (completedOps / totalOps) * 100 : 0;

  const handleViewerClick = useCallback(() => {
    if (viewerTab === "pdf" && pdfUrl) {
      setFullscreenViewer("pdf");
    } else if (stepUrl) {
      setFullscreenViewer("3d");
    }
  }, [viewerTab, pdfUrl, stepUrl]);

  // Handle ESC key to close fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreenViewer) {
        setFullscreenViewer(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenViewer]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Fullscreen Viewer Overlay Portal
  const FullscreenOverlay =
    fullscreenViewer &&
    createPortal(
      <div
        className="fixed inset-0 z-[9999] bg-black/98 flex flex-col"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setFullscreenViewer(null);
          }
        }}
      >
        {/* Overlay Header */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-2",
            "border-b border-white/10",
            "bg-[rgba(17,25,40,0.95)] backdrop-blur-xl"
          )}
        >
          <Tabs
            value={fullscreenViewer}
            onValueChange={(v) => {
              if (v === "pdf" && pdfUrl) setFullscreenViewer("pdf");
              else if (v === "3d" && stepUrl) setFullscreenViewer("3d");
            }}
          >
            <TabsList className="h-8 bg-white/5">
              {pdfUrl && (
                <TabsTrigger value="pdf" className="h-7 text-xs gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  PDF
                </TabsTrigger>
              )}
              {stepUrl && (
                <TabsTrigger value="3d" className="h-7 text-xs gap-1.5">
                  <BoxIcon className="h-3.5 w-3.5" />
                  3D
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
            {selectedOperation && (
              <span className="text-xs text-muted-foreground">
                {selectedOperation.part.part_number} • {selectedOperation.operation_name}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullscreenViewer(null)}
              className="h-9 w-9 bg-white/10 hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Fullscreen Viewer Content */}
        <div className="flex-1 overflow-hidden relative">
          {fullscreenViewer === "pdf" && pdfUrl && <PDFViewer url={pdfUrl} title="Drawing" />}
          {fullscreenViewer === "3d" && stepUrl && <STEPViewer url={stepUrl} title="3D Model" />}
        </div>

        {/* Close hint */}
        <div
          className={cn(
            "absolute bottom-5 left-1/2 -translate-x-1/2",
            "bg-black/80 text-white/60 px-4 py-1.5 rounded-lg",
            "text-xs flex items-center gap-2 pointer-events-none"
          )}
        >
          <X className="h-3 w-3" />
          {t("Tap X or press ESC to close")}
        </div>
      </div>,
      document.body
    );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-background">
      {/* HEADER BAR - Compact Glass Style */}
      <div
        className={cn(
          "px-3 py-2 flex-shrink-0",
          "backdrop-blur-xl bg-[rgba(17,25,40,0.9)]",
          "border-b border-white/10"
        )}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Job Selector */}
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-[200px] h-8 text-xs bg-white/5 border-white/10">
              <SelectValue placeholder={t("Select Job")} />
            </SelectTrigger>
            <SelectContent className="bg-[rgba(20,20,20,0.95)] backdrop-blur-xl border-white/10">
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id} className="text-xs">
                  <span className="font-semibold">{job.job_number}</span>
                  <span className="text-muted-foreground ml-1">- {job.customer || "N/A"}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Job Info Badges */}
          {selectedJob && (
            <>
              <Badge
                variant={isOverdue ? "destructive" : "outline"}
                className="h-6 gap-1 text-[10px]"
              >
                <Calendar className="h-3 w-3" />
                {format(dueDate!, "MMM dd")}
              </Badge>
              <Badge variant="outline" className="h-6 text-[10px] border-primary/50 text-primary">
                {completedOps}/{totalOps}
              </Badge>
            </>
          )}

          <div className="flex-1" />

          {/* Timer Display */}
          {selectedOperation && (
            <div className="flex items-center gap-2">
              {activeTimeEntry && (
                <Badge
                  className={cn(
                    "h-6 text-[10px] font-bold border-2 border-primary",
                    "animate-pulse"
                  )}
                  variant="outline"
                >
                  {t("terminal.youAreClockedOn")}
                </Badge>
              )}
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                  activeTimeEntry
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/10 border border-white/10"
                )}
              >
                <Clock className="h-4 w-4" />
                <span className="font-mono font-bold text-sm min-w-[72px]">
                  {formatElapsedTime(elapsedSeconds)}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <TooltipProvider>
            {selectedOperation && (
              <div className="flex items-center gap-1.5">
                {activeTimeEntry ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStopTracking}
                    className="h-7 text-xs gap-1"
                  >
                    <Square className="h-3 w-3" />
                    {t("Stop")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleStartTracking}
                    disabled={selectedOperation.status === "completed"}
                    className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-3 w-3" />
                    {t("Start")}
                  </Button>
                )}
                {activeTimeEntry && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsQuantityModalOpen(true)}
                        className="h-7 text-xs gap-1 border-primary/50"
                      >
                        <ClipboardList className="h-3 w-3" />
                        {t("Record Qty")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Record Production Quantities</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsIssueFormOpen(true)}
                      className="h-7 text-xs gap-1 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {t("Issue")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("issues.reportIssue", "Report Issue")}</TooltipContent>
                </Tooltip>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompleteOperation}
                  disabled={!!activeTimeEntry || selectedOperation.status === "completed"}
                  className="h-7 text-xs gap-1"
                >
                  <CheckCircle className="h-3 w-3" />
                  {t("Done")}
                </Button>
              </div>
            )}
          </TooltipProvider>
        </div>

        {/* Progress Bar */}
        {selectedJobId && totalOps > 0 && (
          <Progress value={progressPercent} className="h-1 mt-2 bg-white/10" />
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      {!selectedJobId ? (
        <div className="flex-1 flex items-center justify-center">
          <div
            className={cn(
              "p-8 text-center rounded-xl",
              "backdrop-blur-xl bg-[rgba(17,25,40,0.75)]",
              "border border-white/10"
            )}
          >
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{t("Select a job to get started")}</p>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 flex overflow-hidden p-1 gap-0 relative">
          {/* LEFT PANE - File Viewers */}
          <div
            className={cn(
              "flex flex-col overflow-hidden rounded-xl mr-0.5",
              "backdrop-blur-xl bg-[rgba(17,25,40,0.75)]",
              "border border-white/10"
            )}
            style={{
              width: leftPanelCollapsed ? 40 : `${leftPanelWidth}%`,
              minWidth: leftPanelCollapsed ? 40 : 180,
              transition: leftPanelCollapsed ? "width 0.2s ease" : "none",
            }}
          >
            {/* Panel Header */}
            <div
              className={cn(
                "flex items-center min-h-[32px] px-1",
                leftPanelCollapsed ? "justify-center" : "justify-between border-b border-white/10"
              )}
            >
              {!leftPanelCollapsed && (pdfUrl || stepUrl) && (
                <>
                  <Tabs value={viewerTab} onValueChange={setViewerTab}>
                    <TabsList className="h-7 bg-transparent">
                      {pdfUrl && (
                        <TabsTrigger value="pdf" className="h-6 text-[10px] gap-1 px-2">
                          <FileText className="h-3 w-3" />
                          PDF
                        </TabsTrigger>
                      )}
                      {stepUrl && (
                        <TabsTrigger value="3d" className="h-6 text-[10px] gap-1 px-2">
                          <BoxIcon className="h-3 w-3" />
                          3D
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </Tabs>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleViewerClick}
                        className="h-6 w-6 hover:bg-white/10"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("Open fullscreen")}</TooltipContent>
                  </Tooltip>
                </>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                      className="h-6 w-6 hover:bg-white/10"
                    >
                      {leftPanelCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronLeft className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{leftPanelCollapsed ? t("Expand") : t("Collapse")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Viewer Content */}
            {!leftPanelCollapsed && (
              <div
                className={cn(
                  "flex-1 overflow-hidden relative",
                  (pdfUrl || stepUrl) && "cursor-pointer"
                )}
                onClick={(pdfUrl || stepUrl) ? handleViewerClick : undefined}
              >
                {(pdfUrl || stepUrl) && (
                  <>
                    {viewerTab === "pdf" && pdfUrl && (
                      <PDFViewer url={pdfUrl} title="Drawing" compact />
                    )}
                    {((viewerTab === "3d" && stepUrl) || (viewerTab === "pdf" && !pdfUrl && stepUrl)) && (
                      <STEPViewer url={stepUrl} title="3D Model" compact />
                    )}
                    {/* Tap indicator */}
                    <div
                      className={cn(
                        "absolute bottom-2 right-2 px-2 py-1 rounded",
                        "bg-black/70 text-white text-[10px]",
                        "flex items-center gap-1 pointer-events-none opacity-75"
                      )}
                    >
                      <Maximize2 className="h-2.5 w-2.5" />
                      {t("Tap to expand")}
                    </div>
                  </>
                )}
                {!pdfUrl && !stepUrl && (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BoxIcon className="h-8 w-8 mx-auto opacity-25 mb-1" />
                      <span className="text-[10px]">{t("No files")}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resizable Divider */}
          {!leftPanelCollapsed && !rightPanelCollapsed && (
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className="w-3 cursor-col-resize flex items-center justify-center flex-shrink-0 touch-none"
            >
              <div
                className={cn(
                  "w-1 h-12 rounded-full flex items-center justify-center transition-all",
                  isDragging ? "bg-primary opacity-100" : "bg-white/15 opacity-60 hover:opacity-100 hover:bg-primary"
                )}
              >
                <GripVertical className="h-3 w-3 text-white/50 rotate-90" />
              </div>
            </div>
          )}

          {/* RIGHT PANE - Info & Operations */}
          <div
            className={cn(
              "flex flex-col gap-1 overflow-hidden rounded-xl ml-0.5",
              "backdrop-blur-xl bg-[rgba(17,25,40,0.75)]",
              "border border-white/10"
            )}
            style={{
              width: rightPanelCollapsed ? 40 : `${100 - leftPanelWidth}%`,
              minWidth: rightPanelCollapsed ? 40 : 180,
              transition: rightPanelCollapsed ? "width 0.2s ease" : "none",
              padding: rightPanelCollapsed ? 0 : "0.5rem",
            }}
          >
            {/* Panel Collapse Toggle */}
            <div
              className={cn(
                "flex py-0.5",
                rightPanelCollapsed
                  ? "items-center justify-center flex-col h-full"
                  : "items-start justify-end"
              )}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                      className="h-6 w-6 hover:bg-white/10"
                    >
                      {rightPanelCollapsed ? (
                        <ChevronLeft className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {rightPanelCollapsed ? t("Expand") : t("Collapse")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {!rightPanelCollapsed && (
              <>
                {/* Compact Job & Part Info */}
                {selectedOperation && (
                  <div className="flex-shrink-0 p-2 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {t("Current Operation")}
                      </span>
                      <Badge
                        style={{ backgroundColor: selectedOperation.cell.color }}
                        className="h-4 text-[10px] text-white"
                      >
                        {selectedOperation.cell.name}
                      </Badge>
                    </div>
                    <p className="font-bold text-sm leading-tight mb-1">
                      {selectedOperation.operation_name}
                    </p>

                    {/* Compact grid - 3 columns */}
                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <span className="text-[9px] text-muted-foreground block">{t("Part")}</span>
                        <span className="text-[11px] font-medium">
                          {selectedOperation.part.part_number}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block">{t("Qty")}</span>
                        <span className="text-[11px] font-bold">
                          {selectedOperation.part.quantity}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block">
                          {t("Material")}
                        </span>
                        <span className="text-[11px]">{selectedOperation.part.material}</span>
                      </div>
                    </div>

                    {selectedOperation.notes && (
                      <Alert className="mt-2 py-1 px-2 bg-blue-500/10 border-blue-500/30">
                        <Info className="h-3 w-3" />
                        <AlertDescription className="text-[10px] ml-1">
                          {selectedOperation.notes}
                        </AlertDescription>
                      </Alert>
                    )}

                    {isOverdue && (
                      <Alert variant="destructive" className="mt-2 py-1 px-2">
                        <AlertTriangle className="h-3 w-3" />
                        <AlertDescription className="text-[10px] ml-1">
                          {t("Overdue!")} {format(dueDate!, "MMM dd")}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Compact Operations List */}
                <div className="flex-1 flex flex-col overflow-hidden rounded-lg bg-white/5 border border-white/5">
                  <div className="px-2 py-1 border-b border-white/5">
                    <span className="text-[11px] font-bold">
                      {t("Operations")} ({completedOps}/{totalOps})
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto p-1">
                    {operations.map((op, index) => {
                      const isSelected = selectedOperation?.id === op.id;
                      const isCompleted = op.status === "completed";
                      const isInProgress = op.status === "in_progress";

                      return (
                        <div
                          key={op.id}
                          onClick={() => {
                            setSelectedOperation(op);
                            setActiveTimeEntry(op.active_time_entry || null);
                          }}
                          className={cn(
                            "flex items-center gap-1 py-1 px-1.5 mb-0.5 rounded cursor-pointer",
                            "border-l-2 transition-colors min-h-[28px]",
                            isSelected
                              ? "bg-primary/15 border-l-primary"
                              : isCompleted
                                ? "bg-green-500/5 border-l-transparent"
                                : "border-l-transparent hover:bg-white/5"
                          )}
                        >
                          {/* Status Icon */}
                          {isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                          ) : isInProgress ? (
                            <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                          ) : (
                            <Circle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}

                          {/* Operation Info */}
                          <span
                            className={cn(
                              "flex-1 min-w-0 truncate text-[11px]",
                              isSelected && "font-bold",
                              isCompleted && "line-through text-muted-foreground"
                            )}
                          >
                            {index + 1}. {op.operation_name}
                          </span>

                          {/* Time + Active indicator */}
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-muted-foreground">
                              {op.actual_time || 0}/{op.estimated_time}m
                            </span>
                            {op.active_time_entry &&
                              op.active_time_entry.operator_id === operatorId && (
                                <Badge className="h-4 text-[8px] px-1 animate-pulse">
                                  <Clock className="h-2 w-2 mr-0.5" />
                                  {t("terminal.you")}
                                </Badge>
                              )}
                            {op.active_time_entry &&
                              op.active_time_entry.operator_id !== operatorId && (
                                <Clock className="h-2.5 w-2.5 text-yellow-500" />
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Compact Substeps */}
                {selectedOperation && (
                  <div className="flex-shrink-0 max-h-[22%] flex flex-col overflow-hidden rounded-lg bg-white/5 border border-white/5">
                    <div className="px-2 py-1 border-b border-white/5">
                      <span className="text-[11px] font-bold">{t("Substeps")}</span>
                    </div>
                    <div className="flex-1 overflow-auto p-1">
                      <SubstepsManager
                        operationId={selectedOperation.id}
                        operationName={selectedOperation.operation_name}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Overlay */}
      {FullscreenOverlay}

      {/* Production Quantity Modal */}
      {selectedOperation && (
        <ProductionQuantityModal
          isOpen={isQuantityModalOpen}
          onClose={() => setIsQuantityModalOpen(false)}
          operationId={selectedOperation.id}
          operationName={selectedOperation.operation_name}
          partNumber={selectedOperation.part.part_number}
          plannedQuantity={selectedOperation.part.quantity}
          onSuccess={async (quantityGood: number, shouldStopTime: boolean) => {
            setIsQuantityModalOpen(false);
            if (shouldStopTime && activeTimeEntry) {
              await handleStopTracking();
            }
            loadOperations(selectedJobId);
          }}
          onFileIssue={(shortfallQuantity) => {
            setIssuePrefilledData({
              affectedQuantity: shortfallQuantity,
              isShortfall: true
            });
            setIsIssueFormOpen(true);
          }}
        />
      )}

      {/* Issue Form */}
      {selectedOperation && (
        <IssueForm
          operationId={selectedOperation.id}
          open={isIssueFormOpen}
          onOpenChange={(open) => {
            setIsIssueFormOpen(open);
            if (!open) setIssuePrefilledData(null);
          }}
          onSuccess={() => {
            loadOperations(selectedJobId);
            setIssuePrefilledData(null);
          }}
          prefilledData={issuePrefilledData}
        />
      )}
    </div>
  );
}
