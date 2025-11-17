import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Button,
  Checkbox,
  alpha,
  useTheme,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  GetApp as GetAppIcon,
  Visibility as VisibilityIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Operation {
  id: string;
  operation_name: string;
  status: string;
  part_id: string;
  part_number: string;
  job_id: string;
  job_number: string;
  cell: string;
  assigned_operator_id: string | null;
  assigned_name: string | null;
  due_date: string | null;
}

export const Operations: React.FC = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterMaterial, setFilterMaterial] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssigned, setFilterAssigned] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const theme = useTheme();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Load operations data
  useEffect(() => {
    loadOperations();
  }, [profile]);

  const loadOperations = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data } = await supabase
        .from("operations")
        .select(
          `
          id,
          operation_name,
          status,
          assigned_operator_id,
          part_id,
          parts (
            part_number,
            job_id,
            current_cell_id,
            jobs (
              job_number
            )
          ),
          cells (
            name
          ),
          profiles:assigned_operator_id (
            full_name,
            email
          )
        `,
        )
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (data) {
        const mappedOps: Operation[] = data.map((op: any) => ({
          id: op.id,
          operation_name: op.operation_name || "Unknown",
          status: op.status || "not_started",
          part_id: op.part_id,
          part_number: op.parts?.part_number || "Unknown",
          job_id: op.parts?.job_id || "",
          job_number: op.parts?.jobs?.job_number || "Unknown",
          cell: op.cells?.name || "Unknown",
          assigned_operator_id: op.assigned_operator_id,
          assigned_name: op.profiles?.full_name || op.profiles?.email || null,
          due_date: null, // Would come from parts or jobs
        }));

        setOperations(mappedOps);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading operations:", error);
      setLoading(false);
    }
  };

  // Apply filters
  const filteredOperations = operations.filter((op) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !op.part_number.toLowerCase().includes(query) &&
        !op.operation_name.toLowerCase().includes(query) &&
        !op.job_number.toLowerCase().includes(query) &&
        !(op.assigned_name || "").toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (filterStage !== "all" && op.cell !== filterStage) return false;
    if (filterStatus !== "all" && op.status !== filterStatus) return false;
    if (filterAssigned !== "all") {
      if (filterAssigned === "unassigned" && op.assigned_operator_id !== null)
        return false;
      if (filterAssigned === "assigned" && op.assigned_operator_id === null)
        return false;
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "in_progress":
        return "#F59E0B";
      case "not_started":
        return "#3B82F6";
      case "on_hold":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace("_", " ").toUpperCase();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(filteredOperations.map((op) => op.id)));
    } else {
      setSelected(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selected);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelected(newSelected);
  };

  const handleBulkAssign = () => {
    // TODO: Implement bulk assignment modal
    alert(`Assign ${selected.size} operations to an operator`);
  };

  const handleExport = () => {
    const csv = [
      ["Operation", "Part", "Job", "Cell", "Assigned", "Status"].join(","),
      ...filteredOperations.map((op) =>
        [
          op.operation_name,
          op.part_number,
          op.job_number,
          op.cell,
          op.assigned_name || "-",
          op.status,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `operations-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const uniqueCells = [...new Set(operations.map((op) => op.cell))];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Showing {filteredOperations.length} of {operations.length} operations
        </Typography>

        {/* Filters Row */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search by part, operation, operator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
            >
              <MenuItem value="all">All Cells</MenuItem>
              {uniqueCells.map((cell) => (
                <MenuItem key={cell} value={cell}>
                  {cell}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="not_started">Not Started</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="on_hold">On Hold</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={filterAssigned}
              onChange={(e) => setFilterAssigned(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="assigned">Assigned</MenuItem>
              <MenuItem value="unassigned">Unassigned</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            startIcon={<GetAppIcon />}
            onClick={handleExport}
            variant="outlined"
            size="small"
          >
            Export
          </Button>
        </Box>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <Box
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              {selected.size} selected
            </Typography>
            <Button
              startIcon={<PersonAddIcon />}
              onClick={handleBulkAssign}
              variant="contained"
              size="small"
            >
              Assign Selected
            </Button>
            <Button
              onClick={() => setSelected(new Set())}
              variant="outlined"
              size="small"
            >
              Clear Selection
            </Button>
          </Box>
        )}
      </Box>

      {/* Operations Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={
                    selected.size === filteredOperations.length &&
                    filteredOperations.length > 0
                  }
                  indeterminate={
                    selected.size > 0 &&
                    selected.size < filteredOperations.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>Operation</TableCell>
              <TableCell>Part</TableCell>
              <TableCell>Job</TableCell>
              <TableCell>Cell</TableCell>
              <TableCell>Assigned</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOperations.map((op) => (
              <TableRow
                key={op.id}
                sx={{
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.action.hover, 0.08),
                  },
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.has(op.id)}
                    onChange={(e) => handleSelectOne(op.id, e.target.checked)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {op.operation_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      cursor: "pointer",
                      color: theme.palette.primary.main,
                      "&:hover": { textDecoration: "underline" },
                    }}
                    onClick={() => navigate("/admin/parts")}
                  >
                    #{op.part_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      cursor: "pointer",
                      color: theme.palette.primary.main,
                      "&:hover": { textDecoration: "underline" },
                    }}
                    onClick={() => navigate("/admin/jobs")}
                  >
                    JOB-{op.job_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{op.cell}</Typography>
                </TableCell>
                <TableCell>
                  {op.assigned_name ? (
                    <Typography variant="body2">{op.assigned_name}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Unassigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(op.status)}
                    size="small"
                    sx={{
                      backgroundColor: getStatusColor(op.status),
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.7rem",
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View Details">
                    <IconButton size="small">
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Assign">
                    <IconButton size="small">
                      <PersonAddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredOperations.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {searchQuery ||
                    filterStage !== "all" ||
                    filterStatus !== "all"
                      ? "No operations match the current filters"
                      : "No operations available"}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
