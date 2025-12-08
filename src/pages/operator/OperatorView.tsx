"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { PinKeypad } from "../../components/terminal/PinKeypad";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import AnimatedBackground from "@/components/AnimatedBackground";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useMediaQuery } from "@/hooks/use-media-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
  ChevronUp,
  ChevronDown,
  GripVertical,
  ClipboardList,
  AlertTriangle,
  Info,
  Building2,
  UserCheck,
  User,
  KeyRound,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Menu,
  LayoutGrid,
} from "lucide-react";
import { ROUTES } from "@/routes";

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
  const navigate = useNavigate();
  const { profile, tenant } = useAuth();
  const { activeOperator, verifyAndSwitchOperator, clearActiveOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;

  // Responsive breakpoints
  const isMobile = useMediaQuery("(max-width: 639px)");
  const isTablet = useMediaQuery("(min-width: 640px) and (max-width: 1023px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Operator login state
  const [showOperatorLogin, setShowOperatorLogin] = useState(!activeOperator);
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPinEntry, setShowPinEntry] = useState(false);

  // Work state
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

  // Panel collapse states - mobile defaults to operations visible
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);

  // Mobile-specific: which panel is active (viewer or operations)
  const [mobileActivePanel, setMobileActivePanel] = useState<"viewer" | "operations">("operations");

  // Mobile operator menu
  const [operatorMenuOpen, setOperatorMenuOpen] = useState(false);

  // Resizable panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(55);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update operator login visibility when activeOperator changes
  useEffect(() => {
    setShowOperatorLogin(!activeOperator);
  }, [activeOperator]);

  // Load jobs
  useEffect(() => {
    if (profile && activeOperator) {
      loadJobs();
    }
  }, [profile, activeOperator]);

  // Load operations when job is selected
  useEffect(() => {
    if (selectedJobId && activeOperator) {
      loadOperations(selectedJobId);
    } else {
      setOperations([]);
      setSelectedOperation(null);
    }
  }, [selectedJobId, activeOperator]);

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

  // Resizable panel handlers (only for tablet/desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsDragging(true);
  }, [isMobile]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current || isMobile) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.min(75, Math.max(25, newWidth)));
    },
    [isDragging, isMobile]
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
    if (isMobile) return;
    e.preventDefault();
    setIsDragging(true);
  }, [isMobile]);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !containerRef.current || isMobile) return;
      const touch = e.touches[0];
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((touch.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.min(75, Math.max(25, newWidth)));
    },
    [isDragging, isMobile]
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

  // Operator login handlers
  const handleEmployeeIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeId.trim()) {
      setShowPinEntry(true);
      setLoginError(null);
    }
  };

  const handlePinSubmit = async () => {
    if (!employeeId.trim() || pin.length < 4) return;

    setLoginLoading(true);
    setLoginError(null);

    try {
      const result = await verifyAndSwitchOperator(employeeId.trim(), pin);

      if (result.success) {
        setShowOperatorLogin(false);
        setEmployeeId("");
        setPin("");
        setShowPinEntry(false);
      } else {
        setLoginError(result.error_message || t("terminalLogin.invalidCredentials"));
        setPin("");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setLoginError(t("terminalLogin.unexpectedError"));
      setPin("");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleBackToEmployeeId = () => {
    setShowPinEntry(false);
    setPin("");
    setLoginError(null);
  };

  const handleSwitchOperator = () => {
    setShowOperatorLogin(true);
    setEmployeeId("");
    setPin("");
    setShowPinEntry(false);
    setLoginError(null);
    setOperatorMenuOpen(false);
  };

  const handleClockOut = () => {
    clearActiveOperator();
    navigate(ROUTES.OPERATOR.WORK_QUEUE);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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

  // Operator Menu Content (shared between mobile drawer and desktop)
  const OperatorMenuContent = () => (
    <div className="space-y-4">
      {activeOperator && (
        <>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
            <Avatar className="h-12 w-12 border-2 border-green-500">
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-lg">
                {getInitials(activeOperator.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                <span className="font-bold text-green-500">{activeOperator.full_name}</span>
              </div>
              <span className="text-sm text-green-500/70 font-mono">{activeOperator.employee_id}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full h-12 justify-start gap-3 text-base"
              onClick={handleSwitchOperator}
            >
              <RefreshCw className="h-5 w-5" />
              {t("operator.switchOperator")}
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 justify-start gap-3 text-base border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
              onClick={handleClockOut}
            >
              <LogOut className="h-5 w-5" />
              {t("operator.clockOut")}
            </Button>
          </div>
        </>
      )}
    </div>
  );

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
            "flex items-center justify-between px-3 sm:px-4 py-2",
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
            <TabsList className="h-10 sm:h-8 bg-white/5">
              {pdfUrl && (
                <TabsTrigger value="pdf" className="h-9 sm:h-7 text-sm sm:text-xs gap-1.5 px-3 sm:px-2">
                  <FileText className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  PDF
                </TabsTrigger>
              )}
              {stepUrl && (
                <TabsTrigger value="3d" className="h-9 sm:h-7 text-sm sm:text-xs gap-1.5 px-3 sm:px-2">
                  <BoxIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  3D
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 sm:gap-3">
            {selectedOperation && !isMobile && (
              <span className="text-xs text-muted-foreground">
                {selectedOperation.part.part_number} • {selectedOperation.operation_name}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullscreenViewer(null)}
              className="h-10 w-10 sm:h-9 sm:w-9 bg-white/10 hover:bg-white/20"
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
            "bg-black/80 text-white/60 px-4 py-2 rounded-lg",
            "text-sm sm:text-xs flex items-center gap-2 pointer-events-none"
          )}
        >
          <X className="h-4 w-4 sm:h-3 sm:w-3" />
          {t("operatorView.tapToClose")}
        </div>
      </div>,
      document.body
    );

  // Render operator login screen if no operator is selected
  if (showOperatorLogin) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen flex flex-col">
          {/* Top Bar with Org Name */}
          <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border-subtle">
            <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
              {/* Organization Name */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <span className="font-bold text-base sm:text-lg truncate max-w-[180px] sm:max-w-none">
                  {tenant?.company_name || tenant?.name || t("operatorView.shopFloor")}
                </span>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-1 sm:gap-2">
                <ThemeToggle variant="dropdown" />
                <LanguageSwitcher />
              </div>
            </div>
          </header>

          {/* Operator Login Card */}
          <div className="flex-1 flex items-center justify-center pt-16 sm:pt-20 pb-6 sm:pb-8 px-3 sm:px-4">
            <div className="onboarding-card w-full" style={{ maxWidth: isMobile ? "100%" : "420px" }}>
              {!showPinEntry ? (
                /* Employee ID Entry */
                <form onSubmit={handleEmployeeIdSubmit} className="space-y-4 sm:space-y-6">
                  <div className="text-center">
                    <div className="icon-container">
                      <User className="w-16 h-16 sm:w-20 sm:h-20 text-primary browser-icon" strokeWidth={1.5} />
                    </div>
                    <h2 className="hero-title text-lg sm:text-xl mb-2">
                      {t("terminalLogin.enterEmployeeId")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("terminalLogin.employeeIdHint")}
                    </p>
                  </div>

                  <hr className="title-divider" />

                  <div className="space-y-2 text-left">
                    <Label htmlFor="employeeId" className="text-sm font-medium">
                      {t("terminalLogin.employeeId")}
                    </Label>
                    <Input
                      id="employeeId"
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                      required
                      placeholder={t("terminalLogin.employeeIdPlaceholder")}
                      className="bg-input-background border-input text-center text-xl sm:text-2xl font-mono tracking-wider h-14 sm:h-16"
                      autoFocus
                      autoComplete="off"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-14 sm:h-16 text-lg font-semibold cta-button"
                    disabled={!employeeId.trim()}
                  >
                    {t("terminalLogin.continue")}
                    <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6 arrow-icon" />
                  </Button>
                </form>
              ) : (
                /* PIN Entry */
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToEmployeeId}
                      className="text-muted-foreground hover:text-foreground h-10 px-3"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      {t("terminalLogin.back")}
                    </Button>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-bold">{employeeId}</span>
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <KeyRound className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-primary/60 mb-2" />
                    <h2 className="hero-title text-lg">
                      {t("terminalLogin.enterPin")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("terminalLogin.pinHint")}
                    </p>
                  </div>

                  {loginError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                  )}

                  {loginLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Spinner size="lg" className="mb-4" />
                      <p className="text-muted-foreground">
                        {t("terminalLogin.verifying")}
                      </p>
                    </div>
                  ) : (
                    <PinKeypad
                      value={pin}
                      onChange={setPin}
                      onSubmit={handlePinSubmit}
                      maxLength={6}
                      disabled={loginLoading}
                    />
                  )}
                </div>
              )}

              {/* Help Text */}
              <div className="mt-4 sm:mt-6 pt-4 border-t border-white/10">
                <p className="text-xs text-muted-foreground text-center">
                  {t("terminalLogin.helpText")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (loading && !jobs.length) {
    return (
      <>
        <AnimatedBackground />
        <div className="flex justify-center items-center min-h-screen">
          <Spinner size="lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen flex flex-col">
        {/* FIXED TOP HEADER - Glass Morphism */}
        <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border-subtle">
          <div className="flex items-center justify-between h-14 sm:h-16 px-2 sm:px-4">
            {/* Left: Organization Name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="font-bold text-sm sm:text-base lg:text-lg truncate">
                {tenant?.company_name || tenant?.name || t("operatorView.shopFloor")}
              </span>
            </div>

            {/* Center: Current Operator - Desktop/Tablet only */}
            {activeOperator && !isMobile && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-green-500/15 border-2 border-green-500/40">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-green-500">
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-xs sm:text-sm">
                      {getInitials(activeOperator.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-500" />
                      <span className="font-bold text-green-500 text-sm">{activeOperator.full_name}</span>
                    </div>
                    <span className="text-xs text-green-500/70 font-mono">{activeOperator.employee_id}</span>
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSwitchOperator}
                        className="gap-1.5 border-primary/30 hover:bg-primary/10 h-9 sm:h-8"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span className="hidden lg:inline">{t("operator.switchOperator")}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("operator.switchOperator")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClockOut}
                        className="gap-1.5 border-orange-500/30 text-orange-500 hover:bg-orange-500/10 h-9 sm:h-8"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden lg:inline">{t("operator.clockOut")}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("operator.clockOut")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Mobile: Operator Menu Button */}
            {activeOperator && isMobile && (
              <Drawer open={operatorMenuOpen} onOpenChange={setOperatorMenuOpen}>
                <DrawerTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-green-500/40 bg-green-500/10 h-10"
                  >
                    <Avatar className="h-6 w-6 border border-green-500">
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-[10px]">
                        {getInitials(activeOperator.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-green-500" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>{t("terminalLogin.currentOperator")}</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-6">
                    <OperatorMenuContent />
                  </div>
                </DrawerContent>
              </Drawer>
            )}

            {/* Right Side */}
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle variant="dropdown" />
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Main Content - with top padding for fixed header */}
        <main className="flex-1 pt-14 sm:pt-16 flex flex-col overflow-hidden">
          {/* WORK CONTROLS BAR - Responsive */}
          <div
            className={cn(
              "px-2 sm:px-3 py-2 flex-shrink-0",
              "glass-card border-b border-white/10"
            )}
          >
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Job Selector */}
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className={cn(
                  "h-10 sm:h-8 text-sm sm:text-xs bg-white/5 border-white/10",
                  isMobile ? "flex-1 min-w-0" : "w-[200px]"
                )}>
                  <SelectValue placeholder={t("operatorView.selectJob")} />
                </SelectTrigger>
                <SelectContent className="bg-[rgba(20,20,20,0.95)] backdrop-blur-xl border-white/10">
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id} className="text-sm sm:text-xs py-2 sm:py-1.5">
                      <span className="font-semibold">{job.job_number}</span>
                      <span className="text-muted-foreground ml-1">- {job.customer || "N/A"}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Job Info Badges - hidden on mobile when no space */}
              {selectedJob && (
                <>
                  <Badge
                    variant={isOverdue ? "destructive" : "outline"}
                    className="h-7 sm:h-6 gap-1 text-xs sm:text-[10px] hidden xs:flex"
                  >
                    <Calendar className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                    {format(dueDate!, "MMM dd")}
                  </Badge>
                  <Badge variant="outline" className="h-7 sm:h-6 text-xs sm:text-[10px] border-primary/50 text-primary">
                    {completedOps}/{totalOps}
                  </Badge>
                </>
              )}

              {!isMobile && <div className="flex-1" />}

              {/* Timer Display - Responsive */}
              {selectedOperation && (
                <div className="flex items-center gap-2">
                  {activeTimeEntry && !isMobile && (
                    <Badge
                      className={cn(
                        "h-6 text-[10px] font-bold border-2 border-primary",
                        "animate-pulse hidden sm:flex"
                      )}
                      variant="outline"
                    >
                      {t("terminal.youAreClockedOn")}
                    </Badge>
                  )}
                  <div
                    className={cn(
                      "flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg",
                      activeTimeEntry
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/10 border border-white/10"
                    )}
                  >
                    <Clock className="h-4 w-4 sm:h-4 sm:w-4" />
                    <span className="font-mono font-bold text-sm sm:text-sm min-w-[64px] sm:min-w-[72px]">
                      {formatElapsedTime(elapsedSeconds)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons Row - Separate on mobile for touch targets */}
            {selectedOperation && (
              <div className={cn(
                "flex items-center gap-2 mt-2",
                isMobile ? "flex-wrap" : "gap-1.5"
              )}>
                {activeTimeEntry ? (
                  <Button
                    variant="destructive"
                    size={isMobile ? "default" : "sm"}
                    onClick={handleStopTracking}
                    className={cn(
                      "gap-1.5",
                      isMobile ? "h-11 flex-1 text-base" : "h-7 text-xs"
                    )}
                  >
                    <Square className={isMobile ? "h-5 w-5" : "h-3 w-3"} />
                    {t("operatorView.stop")}
                  </Button>
                ) : (
                  <Button
                    size={isMobile ? "default" : "sm"}
                    onClick={handleStartTracking}
                    disabled={selectedOperation.status === "completed"}
                    className={cn(
                      "gap-1.5 bg-green-600 hover:bg-green-700",
                      isMobile ? "h-11 flex-1 text-base" : "h-7 text-xs"
                    )}
                  >
                    <Play className={isMobile ? "h-5 w-5" : "h-3 w-3"} />
                    {t("operatorView.start")}
                  </Button>
                )}

                {activeTimeEntry && (
                  <Button
                    variant="outline"
                    size={isMobile ? "default" : "sm"}
                    onClick={() => setIsQuantityModalOpen(true)}
                    className={cn(
                      "gap-1.5 border-primary/50",
                      isMobile ? "h-11 flex-1 text-base" : "h-7 text-xs"
                    )}
                  >
                    <ClipboardList className={isMobile ? "h-5 w-5" : "h-3 w-3"} />
                    {t("operatorView.recordQty")}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => setIsIssueFormOpen(true)}
                  className={cn(
                    "gap-1.5 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10",
                    isMobile ? "h-11 px-4" : "h-7 text-xs"
                  )}
                >
                  <AlertTriangle className={isMobile ? "h-5 w-5" : "h-3 w-3"} />
                  {!isMobile && t("operatorView.issue")}
                </Button>

                <Button
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={handleCompleteOperation}
                  disabled={!!activeTimeEntry || selectedOperation.status === "completed"}
                  className={cn(
                    "gap-1.5",
                    isMobile ? "h-11 px-4" : "h-7 text-xs"
                  )}
                >
                  <CheckCircle className={isMobile ? "h-5 w-5" : "h-3 w-3"} />
                  {!isMobile && t("operatorView.done")}
                </Button>
              </div>
            )}

            {/* Progress Bar */}
            {selectedJobId && totalOps > 0 && (
              <Progress value={progressPercent} className="h-1.5 sm:h-1 mt-2 bg-white/10" />
            )}
          </div>

          {/* MAIN CONTENT AREA */}
          {!selectedJobId ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div
                className={cn(
                  "p-6 sm:p-8 text-center rounded-xl",
                  "glass-card"
                )}
              >
                <Wrench className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground text-sm sm:text-base">{t("operatorView.selectJobToStart")}</p>
              </div>
            </div>
          ) : isMobile ? (
            /* MOBILE LAYOUT - Tabbed/Stacked View */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Mobile Panel Switcher */}
              <div className="flex border-b border-white/10 bg-white/5">
                <button
                  onClick={() => setMobileActivePanel("operations")}
                  className={cn(
                    "flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                    mobileActivePanel === "operations"
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  {t("operatorView.operations")}
                </button>
                <button
                  onClick={() => setMobileActivePanel("viewer")}
                  className={cn(
                    "flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                    mobileActivePanel === "viewer"
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  {pdfUrl ? "PDF" : stepUrl ? "3D" : t("operatorView.noFiles")}
                </button>
              </div>

              {/* Mobile Panel Content */}
              <div className="flex-1 overflow-hidden">
                {mobileActivePanel === "operations" ? (
                  /* Operations Panel */
                  <div className="h-full flex flex-col overflow-hidden p-2">
                    {/* Current Operation Info */}
                    {selectedOperation && (
                      <div className="flex-shrink-0 p-3 rounded-lg bg-white/5 border border-white/5 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            {t("operatorView.currentOperation")}
                          </span>
                          <Badge
                            style={{ backgroundColor: selectedOperation.cell.color }}
                            className="h-5 text-xs text-white"
                          >
                            {selectedOperation.cell.name}
                          </Badge>
                        </div>
                        <p className="font-bold text-base leading-tight mb-2">
                          {selectedOperation.operation_name}
                        </p>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">{t("operatorView.part")}</span>
                            <span className="text-sm font-medium">{selectedOperation.part.part_number}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">{t("operatorView.qty")}</span>
                            <span className="text-sm font-bold">{selectedOperation.part.quantity}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">{t("operatorView.material")}</span>
                            <span className="text-sm">{selectedOperation.part.material}</span>
                          </div>
                        </div>

                        {selectedOperation.notes && (
                          <Alert className="mt-2 py-2 px-3 bg-blue-500/10 border-blue-500/30">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs ml-2">
                              {selectedOperation.notes}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {/* Operations List */}
                    <div className="flex-1 flex flex-col overflow-hidden rounded-lg bg-white/5 border border-white/5">
                      <div className="px-3 py-2 border-b border-white/5">
                        <span className="text-sm font-bold">
                          {t("operatorView.operations")} ({completedOps}/{totalOps})
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
                                "flex items-center gap-2 py-3 px-3 mb-1 rounded-lg cursor-pointer",
                                "border-l-3 transition-colors min-h-[48px]",
                                isSelected
                                  ? "bg-primary/15 border-l-primary"
                                  : isCompleted
                                    ? "bg-green-500/5 border-l-transparent"
                                    : "border-l-transparent hover:bg-white/5 active:bg-white/10"
                              )}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                              ) : isInProgress ? (
                                <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}

                              <span
                                className={cn(
                                  "flex-1 min-w-0 truncate text-sm",
                                  isSelected && "font-bold",
                                  isCompleted && "line-through text-muted-foreground"
                                )}
                              >
                                {index + 1}. {op.operation_name}
                              </span>

                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {op.actual_time || 0}/{op.estimated_time}m
                                </span>
                                {op.active_time_entry &&
                                  op.active_time_entry.operator_id === operatorId && (
                                    <Badge className="h-5 text-[10px] px-1.5 animate-pulse">
                                      <Clock className="h-3 w-3 mr-0.5" />
                                      {t("terminal.you")}
                                    </Badge>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Substeps - Collapsed by default on mobile */}
                    {selectedOperation && (
                      <div className="flex-shrink-0 mt-2 max-h-[30%] flex flex-col overflow-hidden rounded-lg bg-white/5 border border-white/5">
                        <div className="px-3 py-2 border-b border-white/5">
                          <span className="text-sm font-bold">{t("operatorView.substeps")}</span>
                        </div>
                        <div className="flex-1 overflow-auto p-2">
                          <SubstepsManager
                            operationId={selectedOperation.id}
                            operationName={selectedOperation.operation_name}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Viewer Panel */
                  <div className="h-full flex flex-col p-2">
                    {(pdfUrl || stepUrl) && (
                      <div className="flex items-center gap-2 mb-2">
                        <Tabs value={viewerTab} onValueChange={setViewerTab} className="flex-1">
                          <TabsList className="h-10 bg-white/5 w-full">
                            {pdfUrl && (
                              <TabsTrigger value="pdf" className="h-9 text-sm gap-2 flex-1">
                                <FileText className="h-4 w-4" />
                                PDF
                              </TabsTrigger>
                            )}
                            {stepUrl && (
                              <TabsTrigger value="3d" className="h-9 text-sm gap-2 flex-1">
                                <BoxIcon className="h-4 w-4" />
                                3D
                              </TabsTrigger>
                            )}
                          </TabsList>
                        </Tabs>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleViewerClick}
                          className="h-10 w-10"
                        >
                          <Maximize2 className="h-5 w-5" />
                        </Button>
                      </div>
                    )}

                    <div
                      className={cn(
                        "flex-1 rounded-lg overflow-hidden glass-card",
                        (pdfUrl || stepUrl) && "cursor-pointer"
                      )}
                      onClick={(pdfUrl || stepUrl) ? handleViewerClick : undefined}
                    >
                      {pdfUrl && viewerTab === "pdf" && (
                        <PDFViewer url={pdfUrl} title="Drawing" compact />
                      )}
                      {stepUrl && (viewerTab === "3d" || (!pdfUrl && stepUrl)) && (
                        <STEPViewer url={stepUrl} title="3D Model" compact />
                      )}
                      {!pdfUrl && !stepUrl && (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <BoxIcon className="h-12 w-12 mx-auto opacity-25 mb-2" />
                            <span className="text-sm">{t("operatorView.noFiles")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TABLET/DESKTOP LAYOUT - Split View */
            <div ref={containerRef} className="flex-1 flex overflow-hidden p-1 gap-0 relative">
              {/* LEFT PANE - File Viewers */}
              <div
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl mr-0.5",
                  "glass-card"
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
                    "flex items-center min-h-[36px] sm:min-h-[32px] px-1",
                    leftPanelCollapsed ? "justify-center" : "justify-between border-b border-white/10"
                  )}
                >
                  {!leftPanelCollapsed && (pdfUrl || stepUrl) && (
                    <>
                      <Tabs value={viewerTab} onValueChange={setViewerTab}>
                        <TabsList className="h-8 sm:h-7 bg-transparent">
                          {pdfUrl && (
                            <TabsTrigger value="pdf" className="h-7 sm:h-6 text-xs sm:text-[10px] gap-1 px-2">
                              <FileText className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                              PDF
                            </TabsTrigger>
                          )}
                          {stepUrl && (
                            <TabsTrigger value="3d" className="h-7 sm:h-6 text-xs sm:text-[10px] gap-1 px-2">
                              <BoxIcon className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                              3D
                            </TabsTrigger>
                          )}
                        </TabsList>
                      </Tabs>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleViewerClick}
                              className="h-7 w-7 sm:h-6 sm:w-6 hover:bg-white/10"
                            >
                              <Maximize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("operatorView.openFullscreen")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                          className="h-7 w-7 sm:h-6 sm:w-6 hover:bg-white/10"
                        >
                          {leftPanelCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronLeft className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{leftPanelCollapsed ? t("operatorView.expand") : t("operatorView.collapse")}</TooltipContent>
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
                            "bg-black/70 text-white text-xs sm:text-[10px]",
                            "flex items-center gap-1 pointer-events-none opacity-75"
                          )}
                        >
                          <Maximize2 className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
                          {t("operatorView.tapToExpand")}
                        </div>
                      </>
                    )}
                    {!pdfUrl && !stepUrl && (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BoxIcon className="h-10 w-10 sm:h-8 sm:w-8 mx-auto opacity-25 mb-1" />
                          <span className="text-xs sm:text-[10px]">{t("operatorView.noFiles")}</span>
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
                  className="w-4 sm:w-3 cursor-col-resize flex items-center justify-center flex-shrink-0 touch-none"
                >
                  <div
                    className={cn(
                      "w-1.5 sm:w-1 h-16 sm:h-12 rounded-full flex items-center justify-center transition-all",
                      isDragging ? "bg-primary opacity-100" : "bg-white/15 opacity-60 hover:opacity-100 hover:bg-primary"
                    )}
                  >
                    <GripVertical className="h-4 w-4 sm:h-3 sm:w-3 text-white/50 rotate-90" />
                  </div>
                </div>
              )}

              {/* RIGHT PANE - Info & Operations */}
              <div
                className={cn(
                  "flex flex-col gap-1 overflow-hidden rounded-xl ml-0.5",
                  "glass-card"
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
                          className="h-7 w-7 sm:h-6 sm:w-6 hover:bg-white/10"
                        >
                          {rightPanelCollapsed ? (
                            <ChevronLeft className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {rightPanelCollapsed ? t("operatorView.expand") : t("operatorView.collapse")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {!rightPanelCollapsed && (
                  <>
                    {/* Compact Job & Part Info */}
                    {selectedOperation && (
                      <div className="flex-shrink-0 p-2 sm:p-2 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs sm:text-[10px] text-muted-foreground uppercase tracking-wide">
                            {t("operatorView.currentOperation")}
                          </span>
                          <Badge
                            style={{ backgroundColor: selectedOperation.cell.color }}
                            className="h-5 sm:h-4 text-xs sm:text-[10px] text-white"
                          >
                            {selectedOperation.cell.name}
                          </Badge>
                        </div>
                        <p className="font-bold text-base sm:text-sm leading-tight mb-1">
                          {selectedOperation.operation_name}
                        </p>

                        {/* Compact grid - 3 columns */}
                        <div className="grid grid-cols-3 gap-1">
                          <div>
                            <span className="text-[10px] sm:text-[9px] text-muted-foreground block">{t("operatorView.part")}</span>
                            <span className="text-sm sm:text-[11px] font-medium">
                              {selectedOperation.part.part_number}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] sm:text-[9px] text-muted-foreground block">{t("operatorView.qty")}</span>
                            <span className="text-sm sm:text-[11px] font-bold">
                              {selectedOperation.part.quantity}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] sm:text-[9px] text-muted-foreground block">
                              {t("operatorView.material")}
                            </span>
                            <span className="text-sm sm:text-[11px]">{selectedOperation.part.material}</span>
                          </div>
                        </div>

                        {selectedOperation.notes && (
                          <Alert className="mt-2 py-1.5 sm:py-1 px-2 bg-blue-500/10 border-blue-500/30">
                            <Info className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            <AlertDescription className="text-xs sm:text-[10px] ml-1">
                              {selectedOperation.notes}
                            </AlertDescription>
                          </Alert>
                        )}

                        {isOverdue && (
                          <Alert variant="destructive" className="mt-2 py-1.5 sm:py-1 px-2">
                            <AlertTriangle className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            <AlertDescription className="text-xs sm:text-[10px] ml-1">
                              {t("operatorView.overdue")} {format(dueDate!, "MMM dd")}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {/* Compact Operations List */}
                    <div className="flex-1 flex flex-col overflow-hidden rounded-lg bg-white/5 border border-white/5">
                      <div className="px-2 py-1.5 sm:py-1 border-b border-white/5">
                        <span className="text-sm sm:text-[11px] font-bold">
                          {t("operatorView.operations")} ({completedOps}/{totalOps})
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
                                "flex items-center gap-1.5 sm:gap-1 py-2 sm:py-1 px-2 sm:px-1.5 mb-0.5 rounded cursor-pointer",
                                "border-l-2 transition-colors min-h-[36px] sm:min-h-[28px]",
                                isSelected
                                  ? "bg-primary/15 border-l-primary"
                                  : isCompleted
                                    ? "bg-green-500/5 border-l-transparent"
                                    : "border-l-transparent hover:bg-white/5"
                              )}
                            >
                              {/* Status Icon */}
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 sm:h-3 sm:w-3 text-green-500 flex-shrink-0" />
                              ) : isInProgress ? (
                                <ArrowRight className="h-4 w-4 sm:h-3 sm:w-3 text-primary flex-shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 sm:h-3 sm:w-3 text-muted-foreground flex-shrink-0" />
                              )}

                              {/* Operation Info */}
                              <span
                                className={cn(
                                  "flex-1 min-w-0 truncate text-sm sm:text-[11px]",
                                  isSelected && "font-bold",
                                  isCompleted && "line-through text-muted-foreground"
                                )}
                              >
                                {index + 1}. {op.operation_name}
                              </span>

                              {/* Time + Active indicator */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs sm:text-[9px] text-muted-foreground">
                                  {op.actual_time || 0}/{op.estimated_time}m
                                </span>
                                {op.active_time_entry &&
                                  op.active_time_entry.operator_id === operatorId && (
                                    <Badge className="h-5 sm:h-4 text-[10px] sm:text-[8px] px-1.5 sm:px-1 animate-pulse">
                                      <Clock className="h-3 w-3 sm:h-2 sm:w-2 mr-0.5" />
                                      {t("terminal.you")}
                                    </Badge>
                                  )}
                                {op.active_time_entry &&
                                  op.active_time_entry.operator_id !== operatorId && (
                                    <Clock className="h-3 w-3 sm:h-2.5 sm:w-2.5 text-yellow-500" />
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
                        <div className="px-2 py-1.5 sm:py-1 border-b border-white/5">
                          <span className="text-sm sm:text-[11px] font-bold">{t("operatorView.substeps")}</span>
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
        </main>

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
    </>
  );
}
