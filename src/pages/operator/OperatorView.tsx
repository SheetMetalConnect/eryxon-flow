import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Divider,
  IconButton,
  Dialog,
  Alert,
  CircularProgress,
  SelectChangeEvent,
} from "@mui/material";
import {
  PlayArrow,
  Stop,
  CheckCircle,
  Warning,
  CalendarToday,
  Timer,
  Build,
  Description,
  ViewInAr,
  Flag,
  ReportProblem,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import {
  startTimeTracking,
  stopTimeTracking,
  completeOperation,
} from "../../lib/database";
import { formatDistanceToNow, format } from "date-fns";
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
  const [viewerDialog, setViewerDialog] = useState<{
    type: "pdf" | "step";
    url: string;
  } | null>(null);

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

      // Auto-select first operation if none selected
      if (
        !selectedOperation &&
        operationsWithTimeEntries &&
        operationsWithTimeEntries.length > 0
      ) {
        const firstOp = operationsWithTimeEntries[0];
        setSelectedOperation(firstOp);
        setActiveTimeEntry(firstOp.active_time_entry || null);
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
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 4 }}>
      <Container maxWidth={false} sx={{ pt: 3 }}>
        {/* Header: Job Selection */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t("Select Job")}</InputLabel>
                <Select
                  value={selectedJobId}
                  onChange={(e: SelectChangeEvent) =>
                    setSelectedJobId(e.target.value)
                  }
                  label={t("Select Job")}
                >
                  {jobs.map((job) => (
                    <MenuItem key={job.id} value={job.id}>
                      {job.job_number} - {job.customer || "No Customer"} (
                      {format(
                        new Date(job.due_date_override || job.due_date),
                        "MMM dd, yyyy",
                      )}
                      )
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {selectedJob && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    icon={<CalendarToday />}
                    label={format(dueDate!, "MMM dd, yyyy")}
                    color={isOverdue ? "error" : "default"}
                  />
                  <Chip
                    label={selectedJob.status}
                    color={getStatusColor(selectedJob.status) as any}
                  />
                  {selectedJob.customer && (
                    <Typography variant="body2" color="text.secondary">
                      Customer: {selectedJob.customer}
                    </Typography>
                  )}
                </Stack>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Operation Selection */}
        {selectedJobId && operations.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t("Operations")}
            </Typography>
            <Grid container spacing={2}>
              {operations.map((op) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={op.id}>
                  <Card
                    variant={
                      selectedOperation?.id === op.id ? "outlined" : "elevation"
                    }
                    sx={{
                      cursor: "pointer",
                      borderColor:
                        selectedOperation?.id === op.id
                          ? "primary.main"
                          : undefined,
                      borderWidth: selectedOperation?.id === op.id ? 2 : 1,
                      "&:hover": {
                        boxShadow: 3,
                      },
                    }}
                    onClick={() => {
                      setSelectedOperation(op);
                      setActiveTimeEntry(op.active_time_entry || null);
                    }}
                  >
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {op.operation_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {op.part.part_number}
                        </Typography>
                        <Chip
                          label={op.status}
                          size="small"
                          color={getStatusColor(op.status) as any}
                        />
                        {op.active_time_entry && (
                          <Chip
                            icon={<Timer />}
                            label="Timing"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {selectedOperation && (
          <>
            {/* Full Screen Time Tracker */}
            <Paper
              sx={{
                p: 4,
                mb: 3,
                background: activeTimeEntry
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
              }}
            >
              <Grid container spacing={4} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={2}>
                    <Typography variant="h4" fontWeight="bold">
                      {selectedOperation.operation_name}
                    </Typography>
                    <Typography variant="h6">
                      {selectedOperation.part.part_number} -{" "}
                      {selectedOperation.cell.name}
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Chip
                        icon={<Timer />}
                        label={`Est: ${selectedOperation.estimated_time} min`}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.2)",
                          color: "white",
                        }}
                      />
                      <Chip
                        icon={<Timer />}
                        label={`Actual: ${selectedOperation.actual_time || 0} min`}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.2)",
                          color: "white",
                        }}
                      />
                    </Stack>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={3} alignItems="center">
                    {activeTimeEntry ? (
                      <>
                        <Typography
                          variant="h2"
                          fontWeight="bold"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {formatElapsedTime(elapsedSeconds)}
                        </Typography>
                        <Stack direction="row" spacing={2}>
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={<Stop />}
                            onClick={handleStopTracking}
                            sx={{
                              bgcolor: "error.main",
                              "&:hover": { bgcolor: "error.dark" },
                              minWidth: 150,
                            }}
                          >
                            {t("Stop")}
                          </Button>
                          {selectedOperation.status !== "completed" && (
                            <Button
                              variant="outlined"
                              size="large"
                              startIcon={<CheckCircle />}
                              onClick={handleCompleteOperation}
                              disabled={!!activeTimeEntry}
                              sx={{
                                color: "white",
                                borderColor: "white",
                                "&:hover": {
                                  borderColor: "white",
                                  bgcolor: "rgba(255,255,255,0.1)",
                                },
                              }}
                            >
                              {t("Complete")}
                            </Button>
                          )}
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Typography variant="h3" fontWeight="bold">
                          {t("Ready to Start")}
                        </Typography>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<PlayArrow />}
                          onClick={handleStartTracking}
                          disabled={selectedOperation.status === "completed"}
                          sx={{
                            bgcolor: "success.main",
                            "&:hover": { bgcolor: "success.dark" },
                            minWidth: 200,
                            py: 2,
                            fontSize: "1.2rem",
                          }}
                        >
                          {t("Start Tracking")}
                        </Button>
                      </>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Main Content Grid */}
            <Grid container spacing={3}>
              {/* Left Column: File Viewers */}
              <Grid size={{ xs: 12, lg: 8 }}>
                <Stack spacing={3}>
                  {/* PDF Viewer */}
                  {pdfUrl && (
                    <Paper sx={{ p: 2 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={2}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Description color="error" />
                          <Typography variant="h6">
                            {t("PDF Drawing")}
                          </Typography>
                        </Stack>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            setViewerDialog({ type: "pdf", url: pdfUrl })
                          }
                        >
                          {t("Fullscreen")}
                        </Button>
                      </Stack>
                      <Box
                        sx={{
                          height: 400,
                          bgcolor: "grey.100",
                          borderRadius: 1,
                        }}
                      >
                        <PDFViewer url={pdfUrl} title="Drawing" />
                      </Box>
                    </Paper>
                  )}

                  {/* STEP Viewer */}
                  {stepUrl && (
                    <Paper sx={{ p: 2 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={2}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ViewInAr color="primary" />
                          <Typography variant="h6">{t("3D Model")}</Typography>
                        </Stack>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            setViewerDialog({ type: "step", url: stepUrl })
                          }
                        >
                          {t("Fullscreen")}
                        </Button>
                      </Stack>
                      <Box
                        sx={{
                          height: 500,
                          bgcolor: "grey.100",
                          borderRadius: 1,
                        }}
                      >
                        <STEPViewer url={stepUrl} title="3D Model" />
                      </Box>
                    </Paper>
                  )}

                  {!pdfUrl && !stepUrl && (
                    <Paper sx={{ p: 4, textAlign: "center" }}>
                      <Typography variant="body1" color="text.secondary">
                        {t("No files available for this part")}
                      </Typography>
                    </Paper>
                  )}
                </Stack>
              </Grid>

              {/* Right Column: Info & Substeps */}
              <Grid size={{ xs: 12, lg: 4 }}>
                <Stack spacing={3}>
                  {/* Job & Part Info */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {t("Details")}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t("Job Number")}
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {selectedJob?.job_number}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t("Part Number")}
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {selectedOperation.part.part_number}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t("Material")}
                        </Typography>
                        <Typography variant="body1">
                          {selectedOperation.part.material}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t("Quantity")}
                        </Typography>
                        <Typography variant="body1">
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
                          }}
                        />
                      </Box>

                      <Divider />

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t("Due Date")}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CalendarToday
                            fontSize="small"
                            color={isOverdue ? "error" : "action"}
                          />
                          <Typography
                            variant="body1"
                            color={isOverdue ? "error" : "text.primary"}
                            fontWeight={isOverdue ? "bold" : "normal"}
                          >
                            {dueDate ? format(dueDate, "MMM dd, yyyy") : "N/A"}
                          </Typography>
                        </Stack>
                        {isOverdue && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            {t("This job is overdue!")}
                          </Alert>
                        )}
                      </Box>

                      {selectedOperation.notes && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t("Notes")}
                          </Typography>
                          <Typography variant="body2">
                            {selectedOperation.notes}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>

                  {/* Substeps */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {t("Steps")}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <SubstepsManager
                      operationId={selectedOperation.id}
                      operationName={selectedOperation.operation_name}
                    />
                  </Paper>
                </Stack>
              </Grid>
            </Grid>
          </>
        )}

        {!selectedJobId && (
          <Paper sx={{ p: 6, textAlign: "center" }}>
            <Build sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
            <Typography variant="h5" color="text.secondary">
              {t("Select a job to get started")}
            </Typography>
          </Paper>
        )}
      </Container>

      {/* Fullscreen Viewer Dialog */}
      <Dialog
        open={!!viewerDialog}
        onClose={() => setViewerDialog(null)}
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
        <Box sx={{ height: "100%", p: 2 }}>
          {viewerDialog?.type === "pdf" && (
            <PDFViewer url={viewerDialog.url} title="Drawing" />
          )}
          {viewerDialog?.type === "step" && (
            <STEPViewer url={viewerDialog.url} title="3D Model" />
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
