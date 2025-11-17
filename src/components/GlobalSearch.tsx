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
  Tooltip,
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
  Engineering as EngineeringIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch, SearchResult as SearchResultType } from '@/hooks/useGlobalSearch';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultType[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const { search, loading } = useGlobalSearch();

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const searchResults = await search(query);
      setResults(searchResults);
      setSelectedIndex(0);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, search]);

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

  const handleSelectResult = (result: SearchResultType) => {
    navigate(result.path);
    onClose();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'job':
        return <WorkIcon />;
      case 'part':
        return <InventoryIcon />;
      case 'operation':
        return <EngineeringIcon />;
      case 'user':
        return <PersonIcon />;
      case 'issue':
        return <ReportProblemIcon />;
      default:
        return <SearchIcon />;
    }
  };

  const getStatusIcon = (type: string, status?: string) => {
    if (!status) return null;

    if (type === 'operation' || type === 'job' || type === 'part') {
      if (status === 'completed') return <CheckCircleIcon fontSize="small" sx={{ color: '#10B981' }} />;
      if (status === 'in_progress') return <PlayCircleOutlineIcon fontSize="small" sx={{ color: '#F59E0B' }} />;
      if (status === 'on_hold') return <ScheduleIcon fontSize="small" sx={{ color: '#EF4444' }} />;
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
  }, {} as Record<string, SearchResultType[]>);

  const typeLabels: Record<string, string> = {
    job: 'Jobs',
    part: 'Parts',
    operation: 'Operations',
    user: 'Users',
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
          placeholder="Search jobs, parts, operations, users, issues..."
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
              Search across jobs, parts, operations, users, and issues
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              Searches in job numbers, customers, part numbers, materials, notes, and more
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
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
                  const hasDescription = result.description && result.description.length > 0;

                  return (
                    <ListItem key={result.id} disablePadding sx={{ mb: 0.5 }}>
                      <Tooltip
                        title={hasDescription ? result.description : ''}
                        placement="left"
                        arrow
                      >
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
                            {getResultIcon(result.type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={result.title}
                            secondary={
                              <Box component="span">
                                {result.subtitle}
                                {hasDescription && (
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{
                                      display: 'block',
                                      color: 'text.disabled',
                                      mt: 0.5,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {result.description}
                                  </Typography>
                                )}
                              </Box>
                            }
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
                      </Tooltip>
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
