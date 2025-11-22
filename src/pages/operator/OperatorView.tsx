import React, { useState, useEffect, useMemo } from "react";
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
  Divider,
  IconButton,
  Dialog,
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
  ZoomIn,
  ZoomOut,
  Fullscreen,
  FitScreen,
  Flag,
  ReportProblem,
  CheckCircleOutline,
  RadioButtonUnchecked,
  ArrowForward,
  Close,
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
      {/* HEADER BAR - Job Selection, Timer, Actions */}
      <Paper
        elevation={3}
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 0,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          {/* Job Selector */}
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel>{t("Job")}</InputLabel>
            <Select
              value={selectedJobId}
              onChange={(e: SelectChangeEvent) => setSelectedJobId(e.target.value)}
              label={t("Job")}
            >
              {jobs.map((job) => (
                <MenuItem key={job.id} value={job.id}>
                  <strong>{job.job_number}</strong>&nbsp;- {job.customer || "N/A"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Job Info Chips */}
          {selectedJob && (
            <>
              <Chip
                icon={<CalendarToday />}
                label={format(dueDate!, "MMM dd")}
                color={isOverdue ? "error" : "default"}
                size="small"
              />
              <Chip
                label={`${completedOps}/${totalOps} ops`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </>
          )}

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Timer Display */}
          {selectedOperation && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: activeTimeEntry ? "var(--brand-primary)" : "var(--neutral-800)",
                color: activeTimeEntry ? "var(--primary-foreground)" : "var(--foreground)",
                px: 2,
                py: 0.5,
                borderRadius: 2,
              }}
            >
              <Timer />
              <Typography
                variant="h5"
                sx={{
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  minWidth: 100,
                }}
              >
                {formatElapsedTime(elapsedSeconds)}
              </Typography>
            </Box>
          )}

          {/* Action Buttons */}
          {selectedOperation && (
            <Stack direction="row" spacing={1}>
              {activeTimeEntry ? (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Stop />}
                  onClick={handleStopTracking}
                  size="medium"
                >
                  {t("Stop")}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrow />}
                  onClick={handleStartTracking}
                  disabled={selectedOperation.status === "completed"}
                  size="medium"
                >
                  {t("Start")}
                </Button>
              )}
              <Button
                variant="outlined"
                color="primary"
                startIcon={<CheckCircle />}
                onClick={handleCompleteOperation}
                disabled={!!activeTimeEntry || selectedOperation.status === "completed"}
                size="medium"
              >
                {t("Complete")}
              </Button>
            </Stack>
          )}
        </Box>

        {/* Progress Bar */}
        {selectedJobId && totalOps > 0 && (
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{ mt: 1, height: 4, borderRadius: 2 }}
          />
        )}
      </Paper>

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
          <Paper sx={{ p: 6, textAlign: "center" }}>
            <Build sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
            <Typography variant="h5" color="text.secondary">
              {t("Select a job to get started")}
            </Typography>
          </Paper>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            overflow: "hidden",
            p: 1.5,
            gap: 1.5,
          }}
        >
          {/* LEFT PANE - File Viewers */}
          <Paper
            sx={{
              flex: "0 0 60%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Viewer Tabs */}
            {(pdfUrl || stepUrl) && (
              <>
                <Box sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Tabs
                      value={viewerTab}
                      onChange={(_, v) => setViewerTab(v)}
                      sx={{ minHeight: 40 }}
                    >
                      {pdfUrl && (
                        <Tab
                          icon={<Description fontSize="small" />}
                          iconPosition="start"
                          label={t("PDF Drawing")}
                          sx={{ minHeight: 40, py: 0 }}
                        />
                      )}
                      {stepUrl && (
                        <Tab
                          icon={<ViewInAr fontSize="small" />}
                          iconPosition="start"
                          label={t("3D Model")}
                          sx={{ minHeight: 40, py: 0 }}
                        />
                      )}
                    </Tabs>
                    <Tooltip title={t("Fullscreen")}>
                      <IconButton
                        size="small"
                        onClick={() => setFullscreenViewer(true)}
                      >
                        <Fullscreen />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                {/* Viewer Content */}
                <Box sx={{ flex: 1, overflow: "hidden", p: 1 }}>
                  {viewerTab === 0 && pdfUrl && (
                    <PDFViewer url={pdfUrl} title="Drawing" />
                  )}
                  {((viewerTab === 1 && stepUrl) || (viewerTab === 0 && !pdfUrl && stepUrl)) && (
                    <STEPViewer url={stepUrl} title="3D Model" />
                  )}
                </Box>
              </>
            )}

            {!pdfUrl && !stepUrl && (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.secondary",
                }}
              >
                <Stack alignItems="center" spacing={1}>
                  <ViewInAr sx={{ fontSize: 60, opacity: 0.3 }} />
                  <Typography variant="body1">
                    {t("No files available for this part")}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Paper>

          {/* RIGHT PANE - Info & Operations */}
          <Box
            sx={{
              flex: "0 0 40%",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              overflow: "hidden",
            }}
          >
            {/* Job & Part Info */}
            {selectedOperation && (
              <Paper sx={{ p: 2, flexShrink: 0 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t("Current Operation")}
                </Typography>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {selectedOperation.operation_name}
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.5,
                    mt: 1,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("Job")}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedJob?.job_number}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("Part")}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedOperation.part.part_number}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("Material")}
                    </Typography>
                    <Typography variant="body2">
                      {selectedOperation.part.material}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("Quantity")}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedOperation.part.quantity}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("Cell")}
                    </Typography>
                    <Chip
                      label={selectedOperation.cell.name}
                      size="small"
                      sx={{
                        bgcolor: selectedOperation.cell.color,
                        color: "white",
                        mt: 0.5,
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("Time")}
                    </Typography>
                    <Typography variant="body2">
                      {selectedOperation.actual_time || 0}m / {selectedOperation.estimated_time}m
                    </Typography>
                  </Box>
                </Box>

                {selectedOperation.notes && (
                  <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                    <Typography variant="caption">
                      {selectedOperation.notes}
                    </Typography>
                  </Alert>
                )}

                {isOverdue && (
                  <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                    <Typography variant="caption">
                      {t("Job overdue!")} Due: {format(dueDate!, "MMM dd")}
                    </Typography>
                  </Alert>
                )}
              </Paper>
            )}

            {/* All Operations List */}
            <Paper
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {t("All Operations")} ({operations.length})
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
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
                        gap: 1,
                        p: 1,
                        mb: 0.5,
                        borderRadius: 1,
                        cursor: "pointer",
                        bgcolor: isSelected
                          ? "var(--neutral-800)"
                          : isCompleted
                            ? "rgba(var(--color-success), 0.08)"
                            : "transparent",
                        border: isSelected ? 2 : 1,
                        borderColor: isSelected
                          ? "var(--brand-primary)"
                          : "transparent",
                        "&:hover": {
                          bgcolor: isSelected
                            ? "var(--neutral-800)"
                            : "var(--surface-hover)",
                        },
                      }}
                    >
                      {/* Status Icon */}
                      {isCompleted ? (
                        <CheckCircleOutline
                          fontSize="small"
                          color="success"
                        />
                      ) : isInProgress ? (
                        <ArrowForward
                          fontSize="small"
                          color="primary"
                        />
                      ) : (
                        <RadioButtonUnchecked
                          fontSize="small"
                          color="disabled"
                        />
                      )}

                      {/* Operation Info */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          fontWeight={isSelected ? "bold" : "medium"}
                          noWrap
                          sx={{
                            textDecoration: isCompleted ? "line-through" : "none",
                            color: isCompleted ? "text.secondary" : "text.primary",
                          }}
                        >
                          {index + 1}. {op.operation_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {op.part.part_number}
                        </Typography>
                      </Box>

                      {/* Time */}
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" color="text.secondary">
                          {op.actual_time || 0}/{op.estimated_time}m
                        </Typography>
                        {op.active_time_entry && (
                          <Chip
                            icon={<Timer />}
                            label=""
                            size="small"
                            color="primary"
                            sx={{ ml: 0.5, height: 20, "& .MuiChip-icon": { mr: -0.5 } }}
                          />
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Paper>

            {/* Substeps - Compact */}
            {selectedOperation && (
              <Paper
                sx={{
                  flexShrink: 0,
                  maxHeight: "30%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {t("Substeps")}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
                  <SubstepsManager
                    operationId={selectedOperation.id}
                    operationName={selectedOperation.operation_name}
                  />
                </Box>
              </Paper>
            )}
          </Box>
        </Box>
      )}

      {/* Fullscreen Viewer Dialog */}
      <Dialog
        open={fullscreenViewer}
        onClose={() => setFullscreenViewer(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            width: "95vw",
            height: "95vh",
            maxWidth: "none",
          },
        }}
      >
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Dialog Header */}
          <Box
            sx={{
              p: 1,
              borderBottom: 1,
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Tabs value={viewerTab} onChange={(_, v) => setViewerTab(v)}>
              {pdfUrl && (
                <Tab
                  icon={<Description fontSize="small" />}
                  iconPosition="start"
                  label={t("PDF Drawing")}
                />
              )}
              {stepUrl && (
                <Tab
                  icon={<ViewInAr fontSize="small" />}
                  iconPosition="start"
                  label={t("3D Model")}
                />
              )}
            </Tabs>
            <IconButton onClick={() => setFullscreenViewer(false)}>
              <Close />
            </IconButton>
          </Box>

          {/* Dialog Content */}
          <Box sx={{ flex: 1, overflow: "hidden", p: 1 }}>
            {viewerTab === 0 && pdfUrl && (
              <PDFViewer url={pdfUrl} title="Drawing" />
            )}
            {((viewerTab === 1 && stepUrl) || (viewerTab === 0 && !pdfUrl && stepUrl)) && (
              <STEPViewer url={stepUrl} title="3D Model" />
            )}
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
