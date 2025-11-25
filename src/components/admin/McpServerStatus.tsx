import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
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
  const [retryCount, setRetryCount] = useState(0);

  const fetchHealthWithRetry = async (attempt = 0, maxRetries = 3): Promise<boolean> => {
    if (!tenant?.id) return false;

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

        // Retry with exponential backoff on error
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`Retrying health check in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchHealthWithRetry(attempt + 1, maxRetries);
        }

        setHealth({ status: "unknown" });
        // Only show toast on first load after all retries exhausted
        if (isLoading) {
          toast.error("Failed to load MCP server status after retries");
        }
        return false;
      }

      if (data) {
        setHealth({
          status: data.status as "online" | "offline" | "degraded",
          last_check: data.last_check,
          response_time_ms: data.response_time_ms,
          error_message: data.error_message,
        });
        setRetryCount(0); // Reset retry count on success
        return true;
      } else {
        setHealth({ status: "unknown" });
        return true; // No error, just no data
      }
    } catch (err: any) {
      console.error("Error fetching MCP health:", err);

      // Retry with exponential backoff on exception
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying health check in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchHealthWithRetry(attempt + 1, maxRetries);
      }

      setHealth({ status: "unknown" });
      // Only show toast on first load after all retries exhausted
      if (isLoading) {
        toast.error("Failed to load MCP status: " + (err.message || "Unknown error"));
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealth = () => fetchHealthWithRetry(0, 3);

  useEffect(() => {
    if (!tenant?.id) return;

    fetchHealth();

    // Subscribe to real-time updates for immediate health status changes
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
          // Fetch health without retries on real-time updates (subscription already handles reconnection)
          fetchHealthWithRetry(0, 0);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('MCP health subscription error');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('MCP health channel error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
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
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors hover:text-foreground",
              health.status === "online" && "text-green-500",
              health.status === "offline" && "text-red-500",
              health.status === "degraded" && "text-yellow-500",
              health.status === "unknown" && "text-muted-foreground"
            )}
          >
            <div className={cn(
              "h-2 w-2 rounded-full",
              health.status === "online" && "bg-green-500",
              health.status === "offline" && "bg-red-500",
              health.status === "degraded" && "bg-yellow-500",
              health.status === "unknown" && "bg-muted-foreground/50"
            )} />
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
