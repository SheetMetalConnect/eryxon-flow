"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Cpu,
  Palette,
  Command,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command as CommandPrimitive,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useGlobalSearch, SearchResult as SearchResultType, SearchResultType as ResultTypeEnum } from "@/hooks/useGlobalSearch";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResultType[]>([]);
  const navigate = useNavigate();
  const { search, loading } = useGlobalSearch();

  // Debounced search
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const searchResults = await search(query);
      setResults(searchResults);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, search]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const handleSelectResult = (result: SearchResultType) => {
    navigate(result.path);
    onClose();
  };

  const getResultIcon = (type: ResultTypeEnum) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "job":
        return <Briefcase className={iconClass} />;
      case "part":
        return <Package className={iconClass} />;
      case "operation":
        return <Wrench className={iconClass} />;
      case "user":
        return <User className={iconClass} />;
      case "issue":
        return <AlertTriangle className={iconClass} />;
      case "resource":
        return <Cpu className={iconClass} />;
      case "material":
        return <Palette className={iconClass} />;
      default:
        return <Search className={iconClass} />;
    }
  };

  const getTypeColor = (type: ResultTypeEnum) => {
    switch (type) {
      case "job":
        return "text-blue-400";
      case "part":
        return "text-purple-400";
      case "operation":
        return "text-orange-400";
      case "user":
        return "text-green-400";
      case "issue":
        return "text-red-400";
      case "resource":
        return "text-cyan-400";
      case "material":
        return "text-pink-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (type: ResultTypeEnum, status?: string) => {
    if (!status) return null;

    if (type === "operation" || type === "job" || type === "part") {
      if (status === "completed")
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      if (status === "in_progress")
        return <Play className="h-3.5 w-3.5 text-yellow-500" />;
      if (status === "on_hold")
        return <Clock className="h-3.5 w-3.5 text-red-500" />;
      return <Clock className="h-3.5 w-3.5 text-blue-500" />;
    }

    if (type === "resource" || type === "material") {
      if (status === "active")
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      return <Clock className="h-3.5 w-3.5 text-gray-500" />;
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

  // Ordered type labels for consistent display
  const typeOrder: ResultTypeEnum[] = ['job', 'part', 'operation', 'user', 'issue', 'resource', 'material'];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          "max-w-2xl p-0 gap-0 overflow-hidden",
          "bg-gradient-to-b from-[rgba(25,25,35,0.98)] to-[rgba(15,15,22,0.98)]",
          "backdrop-blur-2xl",
          "border border-white/10",
          "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)]",
          "rounded-xl"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("globalSearch.title")}</DialogTitle>
        </DialogHeader>

        <CommandPrimitive className="bg-transparent" shouldFilter={false}>
          {/* Search Input Area */}
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 bg-white/[0.02]">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <CommandInput
              placeholder={t("globalSearch.placeholder")}
              value={query}
              onValueChange={setQuery}
              className="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 border-0 focus:ring-0"
            />
            <div className="flex items-center gap-2">
              {loading && <Spinner size="sm" className="text-primary" />}
              <button
                onClick={onClose}
                className="flex items-center justify-center w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Keyboard Shortcut Hint */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.01]">
            <span className="text-[10px] text-muted-foreground/60">
              {t("globalSearch.keyboardHint")}
            </span>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-white/5 border border-white/10 rounded text-muted-foreground">
                Esc
              </kbd>
              <span className="text-[10px] text-muted-foreground/60">{t("modals.closeWindow")}</span>
            </div>
          </div>

          <CommandList className="max-h-[60vh] overflow-y-auto">
            {/* Initial State - No Query */}
            {!query.trim() && (
              <div className="px-6 py-14 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-5">
                  <Search className="h-7 w-7 text-primary/80" />
                </div>
                <p className="text-sm font-medium text-foreground/80 mb-2">
                  {t("globalSearch.initialHint")}
                </p>
                <p className="text-xs text-muted-foreground/60 max-w-sm mx-auto">
                  {t("globalSearch.searchFields")}
                </p>

                {/* Quick Type Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                  {typeOrder.map((type) => (
                    <div
                      key={type}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                        "bg-white/5 border border-white/10",
                        "text-[11px] font-medium",
                        getTypeColor(type)
                      )}
                    >
                      {getResultIcon(type)}
                      <span>{t(`globalSearch.typeLabels.${type}`)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {query.trim() && !loading && results.length === 0 && (
              <CommandEmpty className="py-14 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 mb-4">
                  <Search className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("globalSearch.noResults")} "{query}"
                </p>
              </CommandEmpty>
            )}

            {/* Search Results */}
            {typeOrder.map((type) => {
              const items = groupedResults[type];
              if (!items?.length) return null;

              return (
                <CommandGroup
                  key={type}
                  heading={
                    <div className="flex items-center gap-2 px-2">
                      <span className={cn("", getTypeColor(type))}>
                        {getResultIcon(type)}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t(`globalSearch.typeLabels.${type}`)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        ({items.length})
                      </span>
                    </div>
                  }
                  className="px-2 py-2"
                >
                  {items.map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.id}
                      onSelect={() => handleSelectResult(result)}
                      className={cn(
                        "flex items-start gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer",
                        "transition-all duration-150",
                        "data-[selected=true]:bg-primary/10 data-[selected=true]:border-primary/20",
                        "hover:bg-white/5",
                        "border border-transparent"
                      )}
                    >
                      <span className={cn("mt-0.5 p-1.5 rounded-md bg-white/5", getTypeColor(result.type))}>
                        {getResultIcon(result.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground/90 truncate">
                            {result.title}
                          </span>
                        </div>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground/70 block truncate mt-0.5">
                            {result.subtitle}
                          </span>
                        )}
                        {result.description && (
                          <span className="text-[11px] text-muted-foreground/50 block truncate mt-0.5">
                            {result.description}
                          </span>
                        )}
                      </div>
                      {getStatusIcon(result.type, result.status)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
};

// Search Trigger Button Component for reuse
interface SearchTriggerButtonProps {
  onClick: () => void;
  className?: string;
  compact?: boolean;
}

export const SearchTriggerButton: React.FC<SearchTriggerButtonProps> = ({
  onClick,
  className,
  compact = false,
}) => {
  const { t } = useTranslation();

  // Keyboard shortcut handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClick();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClick]);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg",
          "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20",
          "transition-all duration-150",
          "text-muted-foreground hover:text-foreground",
          className
        )}
        title={t("globalSearch.shortcuts.open")}
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full sm:w-auto px-3 py-2 rounded-lg",
        "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20",
        "transition-all duration-150",
        "text-muted-foreground hover:text-foreground",
        "group",
        className
      )}
    >
      <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      <span className="text-sm hidden sm:inline">{t("globalSearch.openSearch")}</span>
      <div className="hidden sm:flex items-center gap-1 ml-auto">
        <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-white/10 border border-white/10 rounded text-muted-foreground/70">
          <Command className="h-2.5 w-2.5 inline" />
        </kbd>
        <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-white/10 border border-white/10 rounded text-muted-foreground/70">
          K
        </kbd>
      </div>
    </button>
  );
};
