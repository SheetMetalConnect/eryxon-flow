import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface McpStatus {
  status: "active" | "inactive" | "not_configured";
  endpoint_count: number;
  active_count: number;
  last_used?: string;
}

export function McpServerStatus() {
  const { tenant } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<McpStatus>({
    status: "not_configured",
    endpoint_count: 0,
    active_count: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    if (!tenant?.id) return;

    try {
      // Check for MCP endpoints
      const { data, error } = await supabase
        .from("mcp_endpoints")
        .select("id, enabled, last_used_at")
        .order("last_used_at", { ascending: false, nullsFirst: false });

      if (error) {
        // Table might not exist yet - that's okay
        if (error.code === '42P01') {
          setStatus({ status: "not_configured", endpoint_count: 0, active_count: 0 });
          return;
        }
        console.error("Error fetching MCP status:", error);
        setStatus({ status: "not_configured", endpoint_count: 0, active_count: 0 });
        return;
      }

      if (!data || data.length === 0) {
        setStatus({ status: "not_configured", endpoint_count: 0, active_count: 0 });
        return;
      }

      const activeEndpoints = data.filter(e => e.enabled);
      const lastUsed = data.find(e => e.last_used_at)?.last_used_at;

      setStatus({
        status: activeEndpoints.length > 0 ? "active" : "inactive",
        endpoint_count: data.length,
        active_count: activeEndpoints.length,
        last_used: lastUsed,
      });
    } catch (err) {
      console.error("Error fetching MCP status:", err);
      setStatus({ status: "not_configured", endpoint_count: 0, active_count: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!tenant?.id) return;

    fetchStatus();

    // Subscribe to changes
    const channel = supabase
      .channel("mcp_endpoints_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mcp_endpoints",
        },
        () => fetchStatus()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id]);

  const getStatusColor = () => {
    switch (status.status) {
      case "active":
        return "text-green-500";
      case "inactive":
        return "text-yellow-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getDotColor = () => {
    switch (status.status) {
      case "active":
        return "bg-green-500";
      case "inactive":
        return "bg-yellow-500";
      default:
        return "bg-muted-foreground/50";
    }
  };

  const getTooltipContent = () => {
    if (status.status === "not_configured") {
      return "MCP not configured\nClick to set up";
    }

    const lines = [
      status.status === "active" ? "MCP Active" : "MCP Inactive",
      `${status.active_count}/${status.endpoint_count} endpoints active`,
    ];

    if (status.last_used) {
      const lastUsed = new Date(status.last_used);
      lines.push(`Last used: ${lastUsed.toLocaleString()}`);
    }

    return lines.join("\n");
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" />
        <span className="text-xs">MCP</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate("/admin/mcp-setup")}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors hover:text-foreground",
              getStatusColor()
            )}
          >
            <div className={cn("h-2 w-2 rounded-full", getDotColor())} />
            <span>MCP</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="whitespace-pre-line text-xs">{getTooltipContent()}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
