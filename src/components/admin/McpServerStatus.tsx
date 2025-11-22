/**
 * MCP Server Status Indicator
 * Shows connection status in the admin header
 */

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface McpServerHealth {
  status: "online" | "offline" | "degraded" | "unknown";
  last_check_at?: string;
  response_time_ms?: number;
  tools_count?: number;
  consecutive_failures?: number;
}

export function McpServerStatus() {
  const { tenant } = useAuth();
  const [health, setHealth] = useState<McpServerHealth>({
    status: "unknown",
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealth = async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("mcp_server_health")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("last_check_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching MCP health:", error);
        setHealth({ status: "unknown" });
        return;
      }

      if (data) {
        setHealth(data as McpServerHealth);
      } else {
        setHealth({ status: "offline" });
      }
    } catch (error) {
      console.error("Error fetching MCP health:", error);
      setHealth({ status: "unknown" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    // Set up real-time subscription for health updates
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

    // Poll for updates every 30 seconds as fallback
    const interval = setInterval(fetchHealth, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [tenant?.id]);

  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }

    switch (health.status) {
      case "online":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "offline":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "degraded":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
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
    const lines: string[] = [getStatusText()];

    if (health.last_check_at) {
      const lastCheck = new Date(health.last_check_at);
      const timeAgo = Math.floor((Date.now() - lastCheck.getTime()) / 1000);

      if (timeAgo < 60) {
        lines.push(`Last checked: ${timeAgo}s ago`);
      } else if (timeAgo < 3600) {
        lines.push(`Last checked: ${Math.floor(timeAgo / 60)}m ago`);
      } else {
        lines.push(`Last checked: ${Math.floor(timeAgo / 3600)}h ago`);
      }
    }

    if (health.response_time_ms) {
      lines.push(`Response time: ${health.response_time_ms}ms`);
    }

    if (health.tools_count) {
      lines.push(`Tools available: ${health.tools_count}`);
    }

    if (health.consecutive_failures && health.consecutive_failures > 0) {
      lines.push(`⚠️ ${health.consecutive_failures} consecutive failures`);
    }

    return lines.join("\n");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => toast.info(getTooltipContent())}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
          >
            {getStatusIcon()}
            <span className="text-sm text-muted-foreground hidden lg:inline">
              MCP
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <pre className="text-xs whitespace-pre-wrap">{getTooltipContent()}</pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
