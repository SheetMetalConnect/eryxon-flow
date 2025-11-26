import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
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
  DragHandle,
  Assignment,
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
import ProductionQuantityModal from "../../components/operator/ProductionQuantityModal";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";

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
  const [fullscreenViewer, setFullscreenViewer] = useState<'pdf' | '3d' | null>(null);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState<boolean>(false);

  // Panel collapse states
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);

  // Resizable panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(55); // percentage
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
    // Constrain between 25% and 75%
    setLeftPanelWidth(Math.min(75, Math.max(25, newWidth)));
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
    setLeftPanelWidth(Math.min(75, Math.max(25, newWidth)));
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

  // Handle viewer tap/click for fullscreen
  const handleViewerClick = useCallback(() => {
    if (viewerTab === 0 && pdfUrl) {
      setFullscreenViewer('pdf');
    } else if (stepUrl) {
      setFullscreenViewer('3d');
    }
  }, [viewerTab, pdfUrl, stepUrl]);

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

  // Fullscreen Viewer Overlay Portal
  const FullscreenOverlay = fullscreenViewer && createPortal(
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        bgcolor: "rgba(0, 0, 0, 0.98)",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          setFullscreenViewer(null);
        }
      }}
    >
      {/* Overlay Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.75,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          bgcolor: "rgba(17, 25, 40, 0.95)",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
        }}
      >
        <Tabs
          value={fullscreenViewer === 'pdf' ? 0 : 1}
          onChange={(_, v) => {
            if (v === 0 && pdfUrl) setFullscreenViewer('pdf');
            else if (v === 1 && stepUrl) setFullscreenViewer('3d');
          }}
          sx={{
            minHeight: 32,
            "& .MuiTab-root": {
              minHeight: 32,
              py: 0,
              px: 1.5,
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

        <Stack direction="row" spacing={1} alignItems="center">
          {selectedOperation && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
              {selectedOperation.part.part_number} • {selectedOperation.operation_name}
            </Typography>
          )}
          <IconButton
            onClick={() => setFullscreenViewer(null)}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.1)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
              width: 36,
              height: 36,
            }}
          >
            <Close sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      </Box>

      {/* Fullscreen Viewer Content */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {fullscreenViewer === 'pdf' && pdfUrl && (
          <PDFViewer url={pdfUrl} title="Drawing" />
        )}
        {fullscreenViewer === '3d' && stepUrl && (
          <STEPViewer url={stepUrl} title="3D Model" />
        )}
      </Box>

      {/* Close hint */}
      <Box
        sx={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          bgcolor: "rgba(0, 0, 0, 0.8)",
          color: "rgba(255, 255, 255, 0.6)",
          px: 2,
          py: 0.75,
          borderRadius: 2,
          fontSize: "0.7rem",
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          pointerEvents: "none",
        }}
      >
        <Close sx={{ fontSize: 12 }} />
        {t("Tap X or press ESC to close")}
      </Box>
    </Box>,
    document.body
  );

  // Handle ESC key to close fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenViewer) {
        setFullscreenViewer(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenViewer]);

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
      {/* HEADER BAR - Compact Glass Style */}
      <Box
        sx={{
          px: 1,
          py: 0.75,
          flexShrink: 0,
          backdropFilter: "blur(16px) saturate(180%)",
          background: "rgba(17, 25, 40, 0.9)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          {/* Job Selector */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel sx={{ fontSize: "0.75rem" }}>{t("Job")}</InputLabel>
            <Select
              value={selectedJobId}
              onChange={(e: SelectChangeEvent) => setSelectedJobId(e.target.value)}
              label={t("Job")}
              sx={{
                fontSize: "0.75rem",
                "& .MuiSelect-select": { py: 0.5 }
              }}
            >
              {jobs.map((job) => (
                <MenuItem key={job.id} value={job.id} sx={{ fontSize: "0.75rem" }}>
                  <strong>{job.job_number}</strong>&nbsp;- {job.customer || "N/A"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Job Info Chips */}
          {selectedJob && (
            <>
              <Chip
                icon={<CalendarToday sx={{ fontSize: 12 }} />}
                label={format(dueDate!, "MMM dd")}
                color={isOverdue ? "error" : "default"}
                size="small"
                sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.65rem" } }}
              />
              <Chip
                label={`${completedOps}/${totalOps}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.65rem" } }}
              />
            </>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Timer Display */}
          {selectedOperation && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {/* Active clocking indicator */}
              {activeTimeEntry && (
                <Chip
                  label={t("terminal.youAreClockedOn")}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{
                    height: 22,
                    fontSize: "0.6rem",
                    fontWeight: "bold",
                    borderWidth: 2,
                    animation: "pulse 2s ease-in-out infinite",
                    "@keyframes pulse": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.7 },
                    },
                  }}
                />
              )}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  bgcolor: activeTimeEntry ? "primary.main" : "rgba(255, 255, 255, 0.08)",
                  color: activeTimeEntry ? "primary.contrastText" : "text.primary",
                  px: 1.25,
                  py: 0.375,
                  borderRadius: 1.5,
                  border: activeTimeEntry ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <Timer sx={{ fontSize: 16 }} />
                <Typography
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    fontSize: "0.9rem",
                    minWidth: 72,
                  }}
                >
                  {formatElapsedTime(elapsedSeconds)}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Action Buttons */}
          {selectedOperation && (
            <Stack direction="row" spacing={0.5}>
              {activeTimeEntry ? (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Stop sx={{ fontSize: 14 }} />}
                  onClick={handleStopTracking}
                  size="small"
                  sx={{ fontSize: "0.7rem", py: 0.375, px: 1.25, minWidth: 0 }}
                >
                  {t("Stop")}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrow sx={{ fontSize: 14 }} />}
                  onClick={handleStartTracking}
                  disabled={selectedOperation.status === "completed"}
                  size="small"
                  sx={{ fontSize: "0.7rem", py: 0.375, px: 1.25, minWidth: 0 }}
                >
                  {t("Start")}
                </Button>
              )}
              {activeTimeEntry && (
                <Tooltip title="Record Production Quantities">
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<Assignment sx={{ fontSize: 14 }} />}
                    onClick={() => setIsQuantityModalOpen(true)}
                    size="small"
                    sx={{ fontSize: "0.7rem", py: 0.375, px: 1.25, minWidth: 0 }}
                  >
                    {t("Record Qty")}
                  </Button>
                </Tooltip>
              )}
              <Button
                variant="outlined"
                color="primary"
                startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
                onClick={handleCompleteOperation}
                disabled={!!activeTimeEntry || selectedOperation.status === "completed"}
                size="small"
                sx={{ fontSize: "0.7rem", py: 0.375, px: 1.25, minWidth: 0 }}
              >
                {t("Done")}
              </Button>
            </Stack>
          )}
        </Box>

        {/* Progress Bar */}
        {selectedJobId && totalOps > 0 && (
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{ mt: 0.5, height: 2, borderRadius: 1, bgcolor: "rgba(255, 255, 255, 0.08)" }}
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
            sx={{
              p: 3,
              textAlign: "center",
              backdropFilter: "blur(16px) saturate(180%)",
              background: "rgba(17, 25, 40, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 2,
            }}
          >
            <Build sx={{ fontSize: 48, color: "text.secondary", mb: 1.5, opacity: 0.4 }} />
            <Typography variant="body1" color="text.secondary">
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
            p: 0.5,
            gap: 0,
            position: "relative",
          }}
        >
          {/* LEFT PANE - File Viewers */}
          <Box
            sx={{
              width: leftPanelCollapsed ? 40 : `${leftPanelWidth}%`,
              minWidth: leftPanelCollapsed ? 40 : 180,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              transition: leftPanelCollapsed ? "width 0.2s ease" : "none",
              backdropFilter: "blur(16px) saturate(180%)",
              background: "rgba(17, 25, 40, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 1.5,
              mr: 0.25,
            }}
          >
            {/* Panel Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: leftPanelCollapsed ? "center" : "space-between",
                borderBottom: leftPanelCollapsed ? "none" : 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
                px: leftPanelCollapsed ? 0 : 0.5,
                py: 0.25,
                minHeight: 32,
              }}
            >
              {!leftPanelCollapsed && (pdfUrl || stepUrl) && (
                <>
                  <Tabs
                    value={viewerTab}
                    onChange={(_, v) => setViewerTab(v)}
                    sx={{
                      minHeight: 28,
                      "& .MuiTab-root": {
                        minHeight: 28,
                        py: 0,
                        px: 0.75,
                        fontSize: "0.65rem",
                        minWidth: 0,
                      }
                    }}
                  >
                    {pdfUrl && (
                      <Tab
                        icon={<Description sx={{ fontSize: 14 }} />}
                        iconPosition="start"
                        label={t("PDF")}
                      />
                    )}
                    {stepUrl && (
                      <Tab
                        icon={<ViewInAr sx={{ fontSize: 14 }} />}
                        iconPosition="start"
                        label={t("3D")}
                      />
                    )}
                  </Tabs>
                  <Tooltip title={t("Open fullscreen")}>
                    <IconButton
                      size="small"
                      onClick={handleViewerClick}
                      sx={{
                        p: 0.375,
                        "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" }
                      }}
                    >
                      <Fullscreen sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              <Tooltip title={leftPanelCollapsed ? t("Expand") : t("Collapse")}>
                <IconButton
                  size="small"
                  onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                  sx={{
                    p: 0.375,
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" }
                  }}
                >
                  {leftPanelCollapsed ? <ChevronRight sx={{ fontSize: 16 }} /> : <ChevronLeft sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Viewer Content - Click/Tap to fullscreen */}
            {!leftPanelCollapsed && (
              <Box
                sx={{
                  flex: 1,
                  overflow: "hidden",
                  position: "relative",
                  cursor: (pdfUrl || stepUrl) ? "pointer" : "default",
                }}
                onClick={(pdfUrl || stepUrl) ? handleViewerClick : undefined}
              >
                {(pdfUrl || stepUrl) && (
                  <>
                    {viewerTab === 0 && pdfUrl && (
                      <PDFViewer url={pdfUrl} title="Drawing" compact />
                    )}
                    {((viewerTab === 1 && stepUrl) || (viewerTab === 0 && !pdfUrl && stepUrl)) && (
                      <STEPViewer url={stepUrl} title="3D Model" compact />
                    )}
                    {/* Tap indicator */}
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 6,
                        right: 6,
                        bgcolor: "rgba(0,0,0,0.7)",
                        color: "white",
                        px: 0.75,
                        py: 0.375,
                        borderRadius: 0.75,
                        fontSize: "0.6rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.375,
                        pointerEvents: "none",
                        opacity: 0.75,
                      }}
                    >
                      <Fullscreen sx={{ fontSize: 10 }} />
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
                      <ViewInAr sx={{ fontSize: 32, opacity: 0.25 }} />
                      <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
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
                width: 12,
                cursor: "col-resize",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                "&:hover": {
                  "& .drag-indicator": {
                    opacity: 1,
                    bgcolor: "primary.main",
                  }
                },
                touchAction: "none",
              }}
            >
              <Box
                className="drag-indicator"
                sx={{
                  width: 4,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: isDragging ? "primary.main" : "rgba(255, 255, 255, 0.15)",
                  opacity: isDragging ? 1 : 0.6,
                  transition: "opacity 0.15s, background-color 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DragHandle sx={{ fontSize: 12, color: "rgba(255,255,255,0.5)", transform: "rotate(90deg)" }} />
              </Box>
            </Box>
          )}

          {/* RIGHT PANE - Info & Operations */}
          <Box
            sx={{
              width: rightPanelCollapsed ? 40 : `${100 - leftPanelWidth}%`,
              minWidth: rightPanelCollapsed ? 40 : 180,
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              overflow: "hidden",
              transition: rightPanelCollapsed ? "width 0.2s ease" : "none",
              backdropFilter: "blur(16px) saturate(180%)",
              background: "rgba(17, 25, 40, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 1.5,
              ml: 0.25,
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
              <Tooltip title={rightPanelCollapsed ? t("Expand") : t("Collapse")}>
                <IconButton
                  size="small"
                  onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                  sx={{
                    p: 0.375,
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" }
                  }}
                >
                  {rightPanelCollapsed ? <ChevronLeft sx={{ fontSize: 16 }} /> : <ChevronRight sx={{ fontSize: 16 }} />}
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
                      p: 0.75,
                      borderRadius: 1,
                      bgcolor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.375 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {t("Current Operation")}
                      </Typography>
                      <Chip
                        label={selectedOperation.cell.name}
                        size="small"
                        sx={{
                          bgcolor: selectedOperation.cell.color,
                          color: "white",
                          height: 16,
                          fontSize: "0.6rem",
                          "& .MuiChip-label": { px: 0.5 }
                        }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.375, lineHeight: 1.2, fontSize: "0.8rem" }}>
                      {selectedOperation.operation_name}
                    </Typography>

                    {/* Compact grid - 3 columns */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 0.375,
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.55rem", display: "block" }}>
                          {t("Part")}
                        </Typography>
                        <Typography variant="caption" fontWeight="medium" sx={{ fontSize: "0.65rem" }}>
                          {selectedOperation.part.part_number}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.55rem", display: "block" }}>
                          {t("Qty")}
                        </Typography>
                        <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.65rem" }}>
                          {selectedOperation.part.quantity}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.55rem", display: "block" }}>
                          {t("Material")}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
                          {selectedOperation.part.material}
                        </Typography>
                      </Box>
                    </Box>

                    {selectedOperation.notes && (
                      <Alert severity="info" sx={{ mt: 0.5, py: 0, px: 0.75, "& .MuiAlert-icon": { py: 0.25, fontSize: 14 } }}>
                        <Typography variant="caption" sx={{ fontSize: "0.6rem" }}>
                          {selectedOperation.notes}
                        </Typography>
                      </Alert>
                    )}

                    {isOverdue && (
                      <Alert severity="error" sx={{ mt: 0.5, py: 0, px: 0.75, "& .MuiAlert-icon": { py: 0.25, fontSize: 14 } }}>
                        <Typography variant="caption" sx={{ fontSize: "0.6rem" }}>
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
                    borderRadius: 1,
                    bgcolor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <Box sx={{ px: 0.75, py: 0.375, borderBottom: 1, borderColor: "rgba(255, 255, 255, 0.05)" }}>
                    <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.65rem" }}>
                      {t("Operations")} ({completedOps}/{totalOps})
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, overflow: "auto", p: 0.375 }}>
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
                            gap: 0.375,
                            py: 0.375,
                            px: 0.5,
                            mb: 0.125,
                            borderRadius: 0.75,
                            cursor: "pointer",
                            bgcolor: isSelected
                              ? "rgba(30, 144, 255, 0.15)"
                              : isCompleted
                                ? "rgba(52, 168, 83, 0.06)"
                                : "transparent",
                            borderLeft: isSelected ? "2px solid" : "2px solid transparent",
                            borderColor: isSelected
                              ? "primary.main"
                              : "transparent",
                            "&:hover": {
                              bgcolor: isSelected
                                ? "rgba(30, 144, 255, 0.2)"
                                : "rgba(255, 255, 255, 0.04)",
                            },
                            transition: "background-color 0.1s",
                            minHeight: 28,
                          }}
                        >
                          {/* Status Icon */}
                          {isCompleted ? (
                            <CheckCircleOutline sx={{ fontSize: 12, color: "success.main" }} />
                          ) : isInProgress ? (
                            <ArrowForward sx={{ fontSize: 12, color: "primary.main" }} />
                          ) : (
                            <RadioButtonUnchecked sx={{ fontSize: 12, color: "text.disabled" }} />
                          )}

                          {/* Operation Info */}
                          <Typography
                            variant="caption"
                            fontWeight={isSelected ? "bold" : "medium"}
                            noWrap
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: "0.65rem",
                              textDecoration: isCompleted ? "line-through" : "none",
                              color: isCompleted ? "text.secondary" : "text.primary",
                            }}
                          >
                            {index + 1}. {op.operation_name}
                          </Typography>

                          {/* Time + Active indicator */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.55rem" }}>
                              {op.actual_time || 0}/{op.estimated_time}m
                            </Typography>
                            {op.active_time_entry && op.active_time_entry.operator_id === profile?.id && (
                              <Chip
                                icon={<Timer sx={{ fontSize: "10px !important" }} />}
                                label={t("terminal.you")}
                                size="small"
                                color="primary"
                                sx={{
                                  height: 16,
                                  fontSize: "0.5rem",
                                  fontWeight: "bold",
                                  "& .MuiChip-label": { px: 0.5 },
                                  "& .MuiChip-icon": { ml: 0.25 },
                                  animation: "pulse 2s ease-in-out infinite",
                                  "@keyframes pulse": {
                                    "0%, 100%": { opacity: 1 },
                                    "50%": { opacity: 0.7 },
                                  },
                                }}
                              />
                            )}
                            {op.active_time_entry && op.active_time_entry.operator_id !== profile?.id && (
                              <Timer sx={{ fontSize: 10, color: "warning.main" }} />
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
                      maxHeight: "22%",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                      borderRadius: 1,
                      bgcolor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <Box sx={{ px: 0.75, py: 0.375, borderBottom: 1, borderColor: "rgba(255, 255, 255, 0.05)" }}>
                      <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.65rem" }}>
                        {t("Substeps")}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, overflow: "auto", p: 0.375 }}>
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
          onSuccess={() => {
            setIsQuantityModalOpen(false);
            loadOperations(selectedJobId);
          }}
        />
      )}
    </Box>
  );
}
