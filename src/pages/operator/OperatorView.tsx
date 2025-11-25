import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Stack,
  IconButton,
  Alert,
  CircularProgress,
  SelectChangeEvent,
  Tabs,
  Tab,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import {
  PlayArrow,
  Stop,
  CheckCircle,
  CalendarToday,
  Timer,
  Build,
  Description,
  ViewInAr,
  Fullscreen,
  CheckCircleOutline,
  RadioButtonUnchecked,
  ArrowForward,
  Close,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
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
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [activeTimeEntry, setActiveTimeEntry] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [stepUrl, setStepUrl] = useState<string | null>(null);
  const [viewerTab, setViewerTab] = useState<number>(0);
  const [fullscreenViewer, setFullscreenViewer] = useState<boolean>(false);

  // Panel collapse states
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);

  // Resizable panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(60); // percentage
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
        const diffInSeconds = Math.floor(
          (now.getTime() - start.getTime()) / 1000,
        );
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
    if (pdfUrl && !stepUrl) setViewerTab(0);
    else if (stepUrl && !pdfUrl) setViewerTab(1);
    else if (pdfUrl) setViewerTab(0);
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
        },
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

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    // Constrain between 30% and 80%
    setLeftPanelWidth(Math.min(80, Math.max(30, newWidth)));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle touch events for tablet
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const touch = e.touches[0];
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((touch.clientX - containerRect.left) / containerRect.width) * 100;
    setLeftPanelWidth(Math.min(80, Math.max(30, newWidth)));
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
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
      // Get all parts for this job
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

      // Get operations with parts and cells
      const { data, error } = await supabase
        .from("operations")
        .select(
          `
          *,
          part:parts(*),
          cell:cells(*)
        `,
        )
        .in("part_id", partIds)
        .eq("tenant_id", profile.tenant_id)
        .order("sequence", { ascending: true });

      if (error) throw error;

      // Get active time entries for these operations
      const operationIds = data?.map((op) => op.id) || [];
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("*")
        .in("operation_id", operationIds)
        .is("end_time", null);

      // Combine data
      const operationsWithTimeEntries = data?.map((op) => ({
        ...op,
        active_time_entry: timeEntries?.find((te) => te.operation_id === op.id),
      }));

      setOperations(operationsWithTimeEntries || []);

      // Auto-select first non-completed operation if none selected
      if (
        !selectedOperation &&
        operationsWithTimeEntries &&
        operationsWithTimeEntries.length > 0
      ) {
        const firstIncomplete = operationsWithTimeEntries.find(
          (op) => op.status !== "completed"
        ) || operationsWithTimeEntries[0];
        setSelectedOperation(firstIncomplete);
        setActiveTimeEntry(firstIncomplete.active_time_entry || null);
      } else if (selectedOperation) {
        // Update selected operation
        const updated = operationsWithTimeEntries?.find(
          (op) => op.id === selectedOperation.id,
        );
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
          const { data } = await supabase.storage
            .from("files")
            .createSignedUrl(path, 3600);
          if (data?.signedUrl) pdf = data.signedUrl;
        } else if ((ext.endsWith(".step") || ext.endsWith(".stp")) && !step) {
          const { data } = await supabase.storage
            .from("files")
            .createSignedUrl(path, 3600);
          if (data?.signedUrl) {
            // Convert to blob for STEP viewer
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
    if (!selectedOperation || !profile) return;

    try {
      await startTimeTracking(
        selectedOperation.id,
        profile.id,
        profile.tenant_id,
      );
      await loadOperations(selectedJobId);
    } catch (error: any) {
      console.error("Error starting time tracking:", error);
      alert(error.message || "Failed to start time tracking");
    }
  };

  const handleStopTracking = async () => {
    if (!selectedOperation || !profile || !activeTimeEntry) return;

    try {
      await stopTimeTracking(selectedOperation.id, profile.id);
      await loadOperations(selectedJobId);
    } catch (error) {
      console.error("Error stopping time tracking:", error);
    }
  };

  const handleCompleteOperation = async () => {
    if (!selectedOperation || !profile) return;

    if (activeTimeEntry) {
      alert("Please stop time tracking before completing the operation");
      return;
    }

    try {
      await completeOperation(
        selectedOperation.id,
        profile.tenant_id,
        profile.id,
      );
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "primary";
      case "on_hold":
        return "warning";
      default:
        return "default";
    }
  };

  const selectedJob = useMemo(() => {
    return jobs.find((j) => j.id === selectedJobId);
  }, [jobs, selectedJobId]);

  const dueDate = selectedJob
    ? new Date(selectedJob.due_date_override || selectedJob.due_date)
    : null;
  const isOverdue = dueDate && dueDate < new Date();

  // Calculate progress
  const completedOps = operations.filter((op) => op.status === "completed").length;
  const totalOps = operations.length;
  const progressPercent = totalOps > 0 ? (completedOps / totalOps) * 100 : 0;

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      {/* HEADER BAR - Job Selection, Timer, Actions - Compact Glass Style */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          flexShrink: 0,
          backdropFilter: "blur(16px) saturate(180%)",
          background: "rgba(17, 25, 40, 0.85)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          {/* Job Selector - Compact */}
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel sx={{ fontSize: "0.8rem" }}>{t("Job")}</InputLabel>
            <Select
              value={selectedJobId}
              onChange={(e: SelectChangeEvent) => setSelectedJobId(e.target.value)}
              label={t("Job")}
              sx={{
                fontSize: "0.8rem",
                "& .MuiSelect-select": { py: 0.75 }
              }}
            >
              {jobs.map((job) => (
                <MenuItem key={job.id} value={job.id} sx={{ fontSize: "0.8rem" }}>
                  <strong>{job.job_number}</strong>&nbsp;- {job.customer || "N/A"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Job Info Chips - More compact */}
          {selectedJob && (
            <>
              <Chip
                icon={<CalendarToday sx={{ fontSize: 14 }} />}
                label={format(dueDate!, "MMM dd")}
                color={isOverdue ? "error" : "default"}
                size="small"
                sx={{ height: 24, "& .MuiChip-label": { px: 1, fontSize: "0.7rem" } }}
              />
              <Chip
                label={`${completedOps}/${totalOps}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 24, "& .MuiChip-label": { px: 1, fontSize: "0.7rem" } }}
              />
            </>
          )}

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Timer Display - Compact */}
          {selectedOperation && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: activeTimeEntry ? "primary.main" : "rgba(255, 255, 255, 0.1)",
                color: activeTimeEntry ? "primary.contrastText" : "text.primary",
                px: 1.5,
                py: 0.5,
                borderRadius: 1.5,
                border: activeTimeEntry ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <Timer sx={{ fontSize: 18 }} />
              <Typography
                sx={{
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  minWidth: 80,
                }}
              >
                {formatElapsedTime(elapsedSeconds)}
              </Typography>
            </Box>
          )}

          {/* Action Buttons - Compact */}
          {selectedOperation && (
            <Stack direction="row" spacing={0.75}>
              {activeTimeEntry ? (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Stop sx={{ fontSize: 16 }} />}
                  onClick={handleStopTracking}
                  size="small"
                  sx={{ fontSize: "0.75rem", py: 0.5, px: 1.5 }}
                >
                  {t("Stop")}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrow sx={{ fontSize: 16 }} />}
                  onClick={handleStartTracking}
                  disabled={selectedOperation.status === "completed"}
                  size="small"
                  sx={{ fontSize: "0.75rem", py: 0.5, px: 1.5 }}
                >
                  {t("Start")}
                </Button>
              )}
              <Button
                variant="outlined"
                color="primary"
                startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                onClick={handleCompleteOperation}
                disabled={!!activeTimeEntry || selectedOperation.status === "completed"}
                size="small"
                sx={{ fontSize: "0.75rem", py: 0.5, px: 1.5 }}
              >
                {t("Done")}
              </Button>
            </Stack>
          )}
        </Box>

        {/* Progress Bar - Thinner */}
        {selectedJobId && totalOps > 0 && (
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{ mt: 0.75, height: 3, borderRadius: 1.5, bgcolor: "rgba(255, 255, 255, 0.1)" }}
          />
        )}
      </Box>

      {/* MAIN CONTENT AREA */}
      {!selectedJobId ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Box
            className="glass-card"
            sx={{
              p: 4,
              textAlign: "center",
              backdropFilter: "blur(16px) saturate(180%)",
              background: "rgba(17, 25, 40, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.125)",
              borderRadius: 3,
            }}
          >
            <Build sx={{ fontSize: 64, color: "text.secondary", mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary">
              {t("Select a job to get started")}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box
          ref={containerRef}
          sx={{
            flex: 1,
            display: "flex",
            overflow: "hidden",
            p: 1,
            gap: 0,
            position: "relative",
          }}
        >
          {/* LEFT PANE - File Viewers */}
          <Box
            className="glass-card"
            sx={{
              width: leftPanelCollapsed ? 48 : `${leftPanelWidth}%`,
              minWidth: leftPanelCollapsed ? 48 : 200,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              transition: leftPanelCollapsed ? "width 0.2s ease" : "none",
              backdropFilter: "blur(16px) saturate(180%)",
              background: "rgba(17, 25, 40, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.125)",
              borderRadius: 2,
              mr: 0.5,
            }}
          >
            {/* Panel Header with Collapse Toggle */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: leftPanelCollapsed ? "none" : 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
                px: 0.5,
                py: 0.25,
                minHeight: 36,
              }}
            >
              {!leftPanelCollapsed && (pdfUrl || stepUrl) && (
                <>
                  <Tabs
                    value={viewerTab}
                    onChange={(_, v) => setViewerTab(v)}
                    sx={{
                      minHeight: 32,
                      "& .MuiTab-root": {
                        minHeight: 32,
                        py: 0,
                        px: 1,
                        fontSize: "0.75rem",
                      }
                    }}
                  >
                    {pdfUrl && (
                      <Tab
                        icon={<Description sx={{ fontSize: 16 }} />}
                        iconPosition="start"
                        label={t("PDF")}
                      />
                    )}
                    {stepUrl && (
                      <Tab
                        icon={<ViewInAr sx={{ fontSize: 16 }} />}
                        iconPosition="start"
                        label={t("3D")}
                      />
                    )}
                  </Tabs>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title={t("Tap to view fullscreen")}>
                      <IconButton
                        size="small"
                        onClick={() => setFullscreenViewer(true)}
                        sx={{
                          p: 0.5,
                          "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" }
                        }}
                      >
                        <Fullscreen sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </>
              )}
              <Tooltip title={leftPanelCollapsed ? t("Expand viewer") : t("Collapse viewer")}>
                <IconButton
                  size="small"
                  onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                  sx={{
                    p: 0.5,
                    ml: leftPanelCollapsed ? "auto" : 0,
                    mr: leftPanelCollapsed ? "auto" : 0,
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" }
                  }}
                >
                  {leftPanelCollapsed ? <ChevronRight sx={{ fontSize: 18 }} /> : <ChevronLeft sx={{ fontSize: 18 }} />}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Viewer Content - Tap to fullscreen */}
            {!leftPanelCollapsed && (
              <Box
                sx={{
                  flex: 1,
                  overflow: "hidden",
                  p: 0.5,
                  position: "relative",
                  cursor: (pdfUrl || stepUrl) ? "pointer" : "default",
                }}
                onClick={(pdfUrl || stepUrl) ? () => setFullscreenViewer(true) : undefined}
              >
                {(pdfUrl || stepUrl) && (
                  <>
                    {viewerTab === 0 && pdfUrl && (
                      <PDFViewer url={pdfUrl} title="Drawing" />
                    )}
                    {((viewerTab === 1 && stepUrl) || (viewerTab === 0 && !pdfUrl && stepUrl)) && (
                      <STEPViewer url={stepUrl} title="3D Model" />
                    )}
                    {/* Tap indicator overlay */}
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        bgcolor: "rgba(0,0,0,0.6)",
                        color: "white",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: "0.65rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        pointerEvents: "none",
                        opacity: 0.8,
                      }}
                    >
                      <Fullscreen sx={{ fontSize: 12 }} />
                      {t("Tap to expand")}
                    </Box>
                  </>
                )}
                {!pdfUrl && !stepUrl && (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "text.secondary",
                    }}
                  >
                    <Stack alignItems="center" spacing={0.5}>
                      <ViewInAr sx={{ fontSize: 40, opacity: 0.3 }} />
                      <Typography variant="caption">
                        {t("No files")}
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* Resizable Divider */}
          {!leftPanelCollapsed && !rightPanelCollapsed && (
            <Box
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              sx={{
                width: 8,
                cursor: "col-resize",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                "&:hover": {
                  "& .drag-indicator": {
                    opacity: 1,
                  }
                },
                touchAction: "none",
              }}
            >
              <Box
                className="drag-indicator"
                sx={{
                  width: 4,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: isDragging ? "primary.main" : "rgba(255, 255, 255, 0.2)",
                  opacity: isDragging ? 1 : 0.5,
                  transition: "opacity 0.2s, background-color 0.2s",
                }}
              />
            </Box>
          )}

          {/* RIGHT PANE - Info & Operations */}
          <Box
            className="glass-card"
            sx={{
              width: rightPanelCollapsed ? 48 : `${100 - leftPanelWidth}%`,
              minWidth: rightPanelCollapsed ? 48 : 200,
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              overflow: "hidden",
              transition: rightPanelCollapsed ? "width 0.2s ease" : "none",
              backdropFilter: "blur(16px) saturate(180%)",
              background: "rgba(17, 25, 40, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.125)",
              borderRadius: 2,
              ml: 0.5,
              p: rightPanelCollapsed ? 0 : 0.5,
            }}
          >
            {/* Panel Collapse Toggle */}
            <Box
              sx={{
                display: "flex",
                alignItems: rightPanelCollapsed ? "center" : "flex-start",
                justifyContent: rightPanelCollapsed ? "center" : "flex-end",
                py: 0.25,
                flexDirection: rightPanelCollapsed ? "column" : "row",
                height: rightPanelCollapsed ? "100%" : "auto",
              }}
            >
              <Tooltip title={rightPanelCollapsed ? t("Expand details") : t("Collapse details")}>
                <IconButton
                  size="small"
                  onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                  sx={{
                    p: 0.5,
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" }
                  }}
                >
                  {rightPanelCollapsed ? <ChevronLeft sx={{ fontSize: 18 }} /> : <ChevronRight sx={{ fontSize: 18 }} />}
                </IconButton>
              </Tooltip>
            </Box>

            {!rightPanelCollapsed && (
              <>
                {/* Compact Job & Part Info */}
                {selectedOperation && (
                  <Box
                    sx={{
                      flexShrink: 0,
                      p: 1,
                      borderRadius: 1.5,
                      bgcolor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {t("Current Operation")}
                      </Typography>
                      <Chip
                        label={selectedOperation.cell.name}
                        size="small"
                        sx={{
                          bgcolor: selectedOperation.cell.color,
                          color: "white",
                          height: 18,
                          fontSize: "0.65rem",
                        }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5, lineHeight: 1.2 }}>
                      {selectedOperation.operation_name}
                    </Typography>

                    {/* Compact grid - 3 columns */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 0.5,
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", display: "block" }}>
                          {t("Job")}
                        </Typography>
                        <Typography variant="caption" fontWeight="medium" sx={{ fontSize: "0.7rem" }}>
                          {selectedJob?.job_number}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", display: "block" }}>
                          {t("Part")}
                        </Typography>
                        <Typography variant="caption" fontWeight="medium" sx={{ fontSize: "0.7rem" }}>
                          {selectedOperation.part.part_number}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", display: "block" }}>
                          {t("Qty")}
                        </Typography>
                        <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.7rem" }}>
                          {selectedOperation.part.quantity}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", display: "block" }}>
                          {t("Material")}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                          {selectedOperation.part.material}
                        </Typography>
                      </Box>
                      <Box sx={{ gridColumn: "span 2" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", display: "block" }}>
                          {t("Time")}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                          {selectedOperation.actual_time || 0}m / {selectedOperation.estimated_time}m est.
                        </Typography>
                      </Box>
                    </Box>

                    {selectedOperation.notes && (
                      <Alert severity="info" sx={{ mt: 0.5, py: 0, px: 1, "& .MuiAlert-icon": { py: 0.5 } }}>
                        <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
                          {selectedOperation.notes}
                        </Typography>
                      </Alert>
                    )}

                    {isOverdue && (
                      <Alert severity="error" sx={{ mt: 0.5, py: 0, px: 1, "& .MuiAlert-icon": { py: 0.5 } }}>
                        <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
                          {t("Overdue!")} {format(dueDate!, "MMM dd")}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                )}

                {/* Compact Operations List */}
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRadius: 1.5,
                    bgcolor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <Box sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: "rgba(255, 255, 255, 0.06)" }}>
                    <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.7rem" }}>
                      {t("Operations")} ({completedOps}/{totalOps})
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, overflow: "auto", p: 0.5 }}>
                    {operations.map((op, index) => {
                      const isSelected = selectedOperation?.id === op.id;
                      const isCompleted = op.status === "completed";
                      const isInProgress = op.status === "in_progress";

                      return (
                        <Box
                          key={op.id}
                          onClick={() => {
                            setSelectedOperation(op);
                            setActiveTimeEntry(op.active_time_entry || null);
                          }}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            py: 0.5,
                            px: 0.75,
                            mb: 0.25,
                            borderRadius: 1,
                            cursor: "pointer",
                            bgcolor: isSelected
                              ? "rgba(30, 144, 255, 0.15)"
                              : isCompleted
                                ? "rgba(52, 168, 83, 0.08)"
                                : "transparent",
                            borderLeft: isSelected ? "2px solid" : "2px solid transparent",
                            borderColor: isSelected
                              ? "primary.main"
                              : "transparent",
                            "&:hover": {
                              bgcolor: isSelected
                                ? "rgba(30, 144, 255, 0.2)"
                                : "rgba(255, 255, 255, 0.05)",
                            },
                            transition: "background-color 0.15s",
                          }}
                        >
                          {/* Compact Status Icon */}
                          {isCompleted ? (
                            <CheckCircleOutline sx={{ fontSize: 14, color: "success.main" }} />
                          ) : isInProgress ? (
                            <ArrowForward sx={{ fontSize: 14, color: "primary.main" }} />
                          ) : (
                            <RadioButtonUnchecked sx={{ fontSize: 14, color: "text.disabled" }} />
                          )}

                          {/* Operation Info - Single line */}
                          <Typography
                            variant="caption"
                            fontWeight={isSelected ? "bold" : "medium"}
                            noWrap
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: "0.7rem",
                              textDecoration: isCompleted ? "line-through" : "none",
                              color: isCompleted ? "text.secondary" : "text.primary",
                            }}
                          >
                            {index + 1}. {op.operation_name}
                          </Typography>

                          {/* Compact Time + Active indicator */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>
                              {op.actual_time || 0}/{op.estimated_time}m
                            </Typography>
                            {op.active_time_entry && (
                              <Timer sx={{ fontSize: 12, color: "primary.main" }} />
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                {/* Compact Substeps */}
                {selectedOperation && (
                  <Box
                    sx={{
                      flexShrink: 0,
                      maxHeight: "25%",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                      borderRadius: 1.5,
                      bgcolor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <Box sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: "rgba(255, 255, 255, 0.06)" }}>
                      <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.7rem" }}>
                        {t("Substeps")}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, overflow: "auto", p: 0.5 }}>
                      <SubstepsManager
                        operationId={selectedOperation.id}
                        operationName={selectedOperation.operation_name}
                      />
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      )}

      {/* Fullscreen Viewer Overlay - Optimized for tablet tap-to-view */}
      {fullscreenViewer && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            bgcolor: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Overlay Header - Compact */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1,
              py: 0.5,
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              bgcolor: "rgba(17, 25, 40, 0.9)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Tabs
              value={viewerTab}
              onChange={(_, v) => setViewerTab(v)}
              sx={{
                minHeight: 36,
                "& .MuiTab-root": {
                  minHeight: 36,
                  py: 0,
                  px: 1.5,
                  fontSize: "0.8rem",
                }
              }}
            >
              {pdfUrl && (
                <Tab
                  icon={<Description sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                  label={t("PDF Drawing")}
                />
              )}
              {stepUrl && (
                <Tab
                  icon={<ViewInAr sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                  label={t("3D Model")}
                />
              )}
            </Tabs>

            <Stack direction="row" spacing={1} alignItems="center">
              {/* Part info in overlay */}
              {selectedOperation && (
                <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
                  {selectedOperation.part.part_number}
                </Typography>
              )}
              <Tooltip title={t("Close (tap anywhere)")}>
                <IconButton
                  onClick={() => setFullscreenViewer(false)}
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                  }}
                >
                  <Close />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Fullscreen Viewer Content */}
          <Box
            sx={{
              flex: 1,
              overflow: "hidden",
              p: 1,
              position: "relative",
            }}
          >
            {viewerTab === 0 && pdfUrl && (
              <PDFViewer url={pdfUrl} title="Drawing" />
            )}
            {((viewerTab === 1 && stepUrl) || (viewerTab === 0 && !pdfUrl && stepUrl)) && (
              <STEPViewer url={stepUrl} title="3D Model" />
            )}
          </Box>

          {/* Bottom hint for closing */}
          <Box
            sx={{
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              bgcolor: "rgba(0, 0, 0, 0.7)",
              color: "rgba(255, 255, 255, 0.7)",
              px: 2,
              py: 0.75,
              borderRadius: 2,
              fontSize: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: 1,
              pointerEvents: "none",
            }}
          >
            <Close sx={{ fontSize: 14 }} />
            {t("Tap X or swipe down to close")}
          </Box>
        </Box>
      )}
    </Box>
  );
}
