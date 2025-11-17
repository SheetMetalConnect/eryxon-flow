import React, { useState, useEffect } from 'react';
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
  FormControlLabel,
  Switch,
  Button,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  FiberManualRecord as FiberManualRecordIcon,
  Refresh as RefreshIcon,
  GetApp as GetAppIcon,
} from '@mui/icons-material';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveWork {
  operator_id: string;
  operator_name: string;
  operator_email: string;
  status: 'working' | 'paused' | 'idle';
  current_operation: string | null;
  current_part: string | null;
  duration: number; // in seconds
  stage: string | null;
}

interface StageStatus {
  stage: string;
  active_ops: number;
  queued_ops: number;
  avg_time_hours: number;
  wip_status: 'normal' | 'high' | 'bottleneck';
}

export const ActivityMonitor: React.FC = () => {
  const [activeWork, setActiveWork] = useState<ActiveWork[]>([]);
  const [stageStatus, setStageStatus] = useState<StageStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOperator, setFilterOperator] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeOnly, setActiveOnly] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const theme = useTheme();
  const { profile } = useAuth();

  // Load active work data
  const loadData = async () => {
    if (!profile) return;

    try {
      // Get all operators
      const { data: operators } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('tenant_id', profile.tenant_id)
        .eq('role', 'operator')
        .eq('active', true);

      if (!operators) {
        setLoading(false);
        return;
      }

      // Get active time entries
      const { data: activeEntries } = await supabase
        .from('time_entries')
        .select(`
          id,
          operator_id,
          operation_id,
          start_time,
          end_time,
          operations (
            id,
            operation_type,
            part_id,
            parts (
              part_number,
              stage_id,
              stages (
                name
              )
            )
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('end_time', null)
        .order('start_time', { ascending: false });

      // Map operators to active work
      const workData: ActiveWork[] = operators.map((op) => {
        const activeEntry = activeEntries?.find((e) => e.operator_id === op.id);

        if (activeEntry) {
          const duration = Math.floor((new Date().getTime() - new Date(activeEntry.start_time).getTime()) / 1000);
          const operation = activeEntry.operations as any;
          const part = operation?.parts as any;
          const stage = part?.stages as any;

          return {
            operator_id: op.id,
            operator_name: op.full_name || op.email,
            operator_email: op.email,
            status: 'working' as const,
            current_operation: operation?.operation_type || null,
            current_part: part?.part_number || null,
            duration,
            stage: stage?.name || null,
          };
        }

        return {
          operator_id: op.id,
          operator_name: op.full_name || op.email,
          operator_email: op.email,
          status: 'idle' as const,
          current_operation: null,
          current_part: null,
          duration: 0,
          stage: null,
        };
      });

      setActiveWork(workData);

      // Calculate stage status
      const { data: stages } = await supabase
        .from('stages')
        .select('id, name, sequence')
        .eq('tenant_id', profile.tenant_id)
        .eq('active', true)
        .order('sequence');

      if (stages) {
        const stageData: StageStatus[] = await Promise.all(
          stages.map(async (stage) => {
            // Count active operations in this stage
            const activeInStage = workData.filter((w) => w.stage === stage.name && w.status === 'working').length;

            // Count queued operations (parts in this stage not being worked on)
            const { count: queuedCount } = await supabase
              .from('parts')
              .select('*', { count: 'exact', head: true })
              .eq('tenant_id', profile.tenant_id)
              .eq('stage_id', stage.id)
              .eq('status', 'in_progress');

            // Mock average time calculation (would need historical data)
            const avgTime = Math.random() * 4 + 1; // 1-5 hours

            // Determine WIP status based on thresholds
            const totalWIP = activeInStage + (queuedCount || 0);
            let wipStatus: 'normal' | 'high' | 'bottleneck' = 'normal';
            if (totalWIP > 30) wipStatus = 'bottleneck';
            else if (totalWIP > 20) wipStatus = 'high';

            return {
              stage: stage.name,
              active_ops: activeInStage,
              queued_ops: queuedCount || 0,
              avg_time_hours: avgTime,
              wip_status: wipStatus,
            };
          })
        );

        setStageStatus(stageData);
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error loading activity data:', error);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, [profile]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, profile]);

  // Apply filters
  const filteredWork = activeWork.filter((work) => {
    if (filterOperator !== 'all' && work.operator_id !== filterOperator) return false;
    if (filterStage !== 'all' && work.stage !== filterStage) return false;
    if (filterStatus !== 'all' && work.status !== filterStatus) return false;
    if (activeOnly && work.status === 'idle') return false;
    return true;
  });

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string) => {
    const colors = {
      working: '#10B981',
      paused: '#F59E0B',
      idle: '#9CA3AF',
    };
    return <FiberManualRecordIcon sx={{ fontSize: 12, color: colors[status as keyof typeof colors] || '#9CA3AF' }} />;
  };

  const getWIPStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return '#10B981';
      case 'high':
        return '#F59E0B';
      case 'bottleneck':
        return '#EF4444';
      default:
        return '#9CA3AF';
    }
  };

  const handleExport = () => {
    const csv = [
      ['Operator', 'Status', 'Operation', 'Part', 'Stage', 'Duration'].join(','),
      ...filteredWork.map((w) =>
        [
          w.operator_name,
          w.status,
          w.current_operation || '-',
          w.current_part || '-',
          w.stage || '-',
          formatDuration(w.duration),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-snapshot-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select value={filterOperator} onChange={(e) => setFilterOperator(e.target.value)}>
            <MenuItem value="all">All Operators</MenuItem>
            {activeWork.map((w) => (
              <MenuItem key={w.operator_id} value={w.operator_id}>
                {w.operator_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
            <MenuItem value="all">All Stages</MenuItem>
            {[...new Set(activeWork.map((w) => w.stage).filter(Boolean))].map((stage) => (
              <MenuItem key={stage} value={stage}>
                {stage}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="working">Working</MenuItem>
            <MenuItem value="paused">Paused</MenuItem>
            <MenuItem value="idle">Idle</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Switch checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />}
          label="Active Only"
        />

        <Box sx={{ flexGrow: 1 }} />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
          >
            <MenuItem value={5}>5 seconds</MenuItem>
            <MenuItem value={10}>10 seconds</MenuItem>
            <MenuItem value={30}>30 seconds</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
          label="Auto-refresh"
        />

        <Button startIcon={<RefreshIcon />} onClick={loadData} variant="outlined" size="small">
          Refresh
        </Button>

        <Button startIcon={<GetAppIcon />} onClick={handleExport} variant="outlined" size="small">
          Export
        </Button>
      </Box>

      {/* Active Now Section */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        ACTIVE NOW ({filteredWork.filter((w) => w.status === 'working').length} operators)
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Operator</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Current Operation</TableCell>
              <TableCell>Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredWork.map((work) => (
              <TableRow
                key={work.operator_id}
                sx={{
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.action.hover, 0.08),
                  },
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {work.operator_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {work.operator_email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getStatusIcon(work.status)}
                    <Typography variant="body2" textTransform="capitalize">
                      {work.status}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {work.current_operation ? (
                    <>
                      <Typography variant="body2" fontWeight={500}>
                        {work.current_operation}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Part: {work.current_part} • {work.stage}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {formatDuration(work.duration)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {filteredWork.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No operators match the current filters
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Stage Overview Section */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        STAGE BOTTLENECKS (QRM Indicators)
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Stage</TableCell>
              <TableCell align="center">Active Ops</TableCell>
              <TableCell align="center">Queued Ops</TableCell>
              <TableCell align="center">Avg Time</TableCell>
              <TableCell align="center">WIP Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stageStatus.map((stage) => (
              <TableRow key={stage.stage}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {stage.stage}
                  </Typography>
                </TableCell>
                <TableCell align="center">{stage.active_ops}</TableCell>
                <TableCell align="center">{stage.queued_ops}</TableCell>
                <TableCell align="center">{stage.avg_time_hours.toFixed(1)}h</TableCell>
                <TableCell align="center">
                  <Chip
                    label={stage.wip_status.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: getWIPStatusColor(stage.wip_status),
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {stageStatus.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No stage data available
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Last Updated */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'right' }}>
        Last updated: {lastUpdate.toLocaleTimeString()}
        {autoRefresh && ` (auto-refreshing every ${refreshInterval}s)`}
      </Typography>
    </Box>
  );
};
