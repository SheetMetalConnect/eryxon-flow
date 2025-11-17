import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Dialog,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  CircularProgress,
  alpha,
  useTheme,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Work as WorkIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  ReportProblem as ReportProblemIcon,
  PlayCircleOutline as PlayCircleOutlineIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  id: string;
  type: 'job' | 'part' | 'operation' | 'operator' | 'issue';
  title: string;
  subtitle: string;
  path: string;
  status?: string;
  icon?: React.ReactNode;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const { profile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    const searchResults: SearchResult[] = [];
    const lowerQuery = searchQuery.toLowerCase();

    try {
      // Search Jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, job_number, customer, due_date, status')
        .eq('tenant_id', profile?.tenant_id)
        .or(`job_number.ilike.%${searchQuery}%,customer.ilike.%${searchQuery}%`)
        .limit(10);

      jobs?.forEach((job) => {
        searchResults.push({
          id: job.id,
          type: 'job',
          title: `JOB-${job.job_number}`,
          subtitle: job.customer || 'No customer',
          path: `/admin/jobs`,
          status: job.status,
          icon: <WorkIcon />,
        });
      });

      // Search Parts
      const { data: parts } = await supabase
        .from('parts')
        .select('id, part_number, job_id, material, current_cell_id')
        .eq('tenant_id', profile?.tenant_id)
        .ilike('part_number', `%${searchQuery}%`)
        .limit(10);

      parts?.forEach((part) => {
        searchResults.push({
          id: part.id,
          type: 'part',
          title: `Part #${part.part_number}`,
          subtitle: 'Part',
          path: `/admin/parts`,
          icon: <InventoryIcon />,
        });
      });

      // Search Operators (Users)
      const { data: operators } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('tenant_id', profile?.tenant_id)
        .eq('role', 'operator')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      operators?.forEach((operator) => {
        searchResults.push({
          id: operator.id,
          type: 'operator',
          title: operator.full_name || operator.email,
          subtitle: operator.email,
          path: `/admin/users`,
          icon: <PersonIcon />,
        });
      });

      // Search Issues
      const { data: issues } = await supabase
        .from('issues')
        .select('id, description, severity, status, operation_id')
        .eq('tenant_id', profile?.tenant_id)
        .ilike('description', `%${searchQuery}%`)
        .limit(10);

      issues?.forEach((issue) => {
        searchResults.push({
          id: issue.id,
          type: 'issue',
          title: issue.description || 'Untitled Issue',
          subtitle: `${issue.severity} severity`,
          path: `/admin/issues`,
          status: issue.status,
          icon: <ReportProblemIcon />,
        });
      });

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelectResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    navigate(result.path);
    onClose();
  };

  const getStatusIcon = (type: string, status?: string) => {
    if (type === 'operation') {
      if (status === 'completed') return <CheckCircleIcon fontSize="small" sx={{ color: '#10B981' }} />;
      if (status === 'in_progress') return <PlayCircleOutlineIcon fontSize="small" sx={{ color: '#F59E0B' }} />;
      return <ScheduleIcon fontSize="small" sx={{ color: '#3B82F6' }} />;
    }
    return null;
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const typeLabels: Record<string, string> = {
    job: 'Jobs',
    part: 'Parts',
    operation: 'Operations',
    operator: 'Operators',
    issue: 'Issues',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh',
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="Search jobs, parts, operators..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: loading ? (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ) : null,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.5,
            },
          }}
        />
      </Box>

      <Box sx={{ maxHeight: 'calc(80vh - 100px)', overflow: 'auto', pb: 1 }}>
        {!query.trim() && (
          <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
            <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Type to search across jobs, parts, operators, and more...
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              Use ↑↓ arrows to navigate, Enter to select, Esc to close
            </Typography>
          </Box>
        )}

        {query.trim() && !loading && results.length === 0 && (
          <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No results found for "{query}"
            </Typography>
          </Box>
        )}

        {results.length > 0 && (
          <List sx={{ px: 1 }}>
            {Object.entries(groupedResults).map(([type, items]) => (
              <Box key={type} sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 2,
                    py: 0.5,
                    display: 'block',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    letterSpacing: '0.5px',
                  }}
                >
                  {typeLabels[type]} ({items.length})
                </Typography>
                {items.map((result, idx) => {
                  const globalIndex = results.findIndex((r) => r.id === result.id);
                  return (
                    <ListItem key={result.id} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        selected={globalIndex === selectedIndex}
                        onClick={() => handleSelectResult(result)}
                        sx={{
                          borderRadius: 1.5,
                          mx: 1,
                          '&.Mui-selected': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.12),
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.18),
                            },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {result.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={result.title}
                          secondary={result.subtitle}
                          primaryTypographyProps={{
                            fontWeight: 500,
                            fontSize: '0.95rem',
                          }}
                          secondaryTypographyProps={{
                            fontSize: '0.8rem',
                          }}
                        />
                        {getStatusIcon(result.type, result.status)}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </Box>
            ))}
          </List>
        )}
      </Box>
    </Dialog>
  );
};
