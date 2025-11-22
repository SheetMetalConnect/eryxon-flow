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

interface McpServerHealth {
  status: "online" | "offline" | "degraded" | "unknown";
  last_check?: string;
  response_time_ms?: number;
  error_message?: string;
}

export function McpServerStatus() {
  const { tenant } = useAuth();
  const [health, setHealth] = useState<McpServerHealth>({ status: "unknown" });
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealth = async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("mcp_server_health")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("last_check", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching MCP health:", error);
        setHealth({ status: "unknown" });
        return;
      }

      if (data) {
        setHealth({
          status: data.status as "online" | "offline" | "degraded",
          last_check: data.last_check,
          response_time_ms: data.response_time_ms,
          error_message: data.error_message,
        });
      } else {
        setHealth({ status: "unknown" });
      }
    } catch (err) {
      console.error("Error fetching MCP health:", err);
      setHealth({ status: "unknown" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("mcp_health_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mcp_server_health",
          filter: `tenant_id=eq.${tenant?.id}`,
        },
        () => {
          fetchHealth();
        }
      )
      .subscribe();

    // Poll every 30 seconds
    const interval = setInterval(fetchHealth, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [tenant?.id]);

  const getStatusIcon = () => {
    switch (health.status) {
      case "online":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "offline":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "degraded":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (health.status) {
      case "online":
        return "MCP Server Online";
      case "offline":
        return "MCP Server Offline";
      case "degraded":
        return "MCP Server Degraded";
      default:
        return "MCP Server Status Unknown";
    }
  };

  const getTooltipContent = () => {
    const lines = [getStatusText()];

    if (health.last_check) {
      const lastCheck = new Date(health.last_check);
      lines.push(`Last Check: ${lastCheck.toLocaleString()}`);
    }

    if (health.response_time_ms) {
      lines.push(`Response Time: ${health.response_time_ms}ms`);
    }

    if (health.error_message) {
      lines.push(`Error: ${health.error_message}`);
    }

    return lines.join("\n");
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <AlertCircle className="h-4 w-4 animate-pulse" />
        <span className="text-sm">MCP</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 text-sm transition-colors hover:text-foreground",
              health.status === "online" && "text-green-500",
              health.status === "offline" && "text-red-500",
              health.status === "degraded" && "text-yellow-500",
              health.status === "unknown" && "text-muted-foreground"
            )}
          >
            {getStatusIcon()}
            <span>MCP</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="whitespace-pre-line">{getTooltipContent()}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
