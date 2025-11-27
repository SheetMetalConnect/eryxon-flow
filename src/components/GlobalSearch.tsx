"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Briefcase,
  Package,
  CheckCircle,
  User,
  AlertTriangle,
  Play,
  Clock,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useGlobalSearch, SearchResult as SearchResultType } from "@/hooks/useGlobalSearch";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResultType[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const navigate = useNavigate();
  const { search, loading } = useGlobalSearch();

  // Debounced search
  React.useEffect(() => {
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

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  const handleSelectResult = (result: SearchResultType) => {
    navigate(result.path);
    onClose();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "job":
        return <Briefcase className="h-4 w-4" />;
      case "part":
        return <Package className="h-4 w-4" />;
      case "operation":
        return <Wrench className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      case "issue":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (type: string, status?: string) => {
    if (!status) return null;

    if (type === "operation" || type === "job" || type === "part") {
      if (status === "completed")
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (status === "in_progress")
        return <Play className="h-4 w-4 text-yellow-500" />;
      if (status === "on_hold")
        return <Clock className="h-4 w-4 text-red-500" />;
      return <Clock className="h-4 w-4 text-blue-500" />;
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
    job: "Jobs",
    part: "Parts",
    operation: "Operations",
    user: "Users",
    issue: "Issues",
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          "max-w-lg p-0 gap-0 overflow-hidden",
          "bg-[rgba(20,20,20,0.95)] backdrop-blur-xl",
          "border border-white/10",
          "shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Global Search</DialogTitle>
        </DialogHeader>
        <Command className="bg-transparent" shouldFilter={false}>
          <div className="flex items-center border-b border-white/10 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandInput
              placeholder="Search jobs, parts, operations, users, issues..."
              value={query}
              onValueChange={setQuery}
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {loading && <Spinner size="sm" className="ml-2" />}
          </div>
          <CommandList className="max-h-[60vh] overflow-y-auto p-2">
            {!query.trim() && (
              <div className="px-4 py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Search across jobs, parts, operations, users, and issues
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  Searches in job numbers, customers, part numbers, materials, notes, and more
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  Use ↑↓ arrows to navigate, Enter to select, Esc to close
                </p>
              </div>
            )}

            {query.trim() && !loading && results.length === 0 && (
              <CommandEmpty className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No results found for "{query}"
                </p>
              </CommandEmpty>
            )}

            {Object.entries(groupedResults).map(([type, items]) => (
              <CommandGroup
                key={type}
                heading={
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {typeLabels[type]} ({items.length})
                  </span>
                }
                className="mb-2"
              >
                {items.map((result) => {
                  const hasDescription =
                    result.description && result.description.length > 0;

                  return (
                    <CommandItem
                      key={result.id}
                      value={result.id}
                      onSelect={() => handleSelectResult(result)}
                      className={cn(
                        "flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                        "data-[selected=true]:bg-primary/15"
                      )}
                    >
                      <span className="mt-0.5 text-muted-foreground">
                        {getResultIcon(result.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {result.title}
                          </span>
                        </div>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground block truncate">
                            {result.subtitle}
                          </span>
                        )}
                        {hasDescription && (
                          <span className="text-xs text-muted-foreground/60 block truncate mt-0.5">
                            {result.description}
                          </span>
                        )}
                      </div>
                      {getStatusIcon(result.type, result.status)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
