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
  status: "online" | "offline" | "degraded" | "unknown" | "not_configured";
  last_check?: string;
  response_time_ms?: number;
  error_message?: string;
}

export function McpServerStatus() {
  const { tenant } = useAuth();
  const [health, setHealth] = useState<McpServerHealth>({ status: "unknown" });
  const [isLoading, setIsLoading] = useState(true);
  const [mcpEnabled, setMcpEnabled] = useState<boolean | null>(null);

  // Check if MCP is configured and enabled for this tenant
  const checkMcpConfig = async (): Promise<boolean> => {
    if (!tenant?.id) return false;

    try {
      const { data, error } = await supabase
        .from("mcp_server_config")
        .select("enabled")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error || !data) {
        // No config means MCP is not set up - this is not an error
        setMcpEnabled(false);
        return false;
      }

      setMcpEnabled(data.enabled);
      return data.enabled;
    } catch {
      setMcpEnabled(false);
      return false;
    }
  };

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

        // Don't show error toast - just silently set to unknown
        setHealth({ status: "unknown" });
        return false;
      }

      if (data) {
        setHealth({
          status: data.status as "online" | "offline" | "degraded",
          last_check: data.last_check,
          response_time_ms: data.response_time_ms,
          error_message: data.error_message,
        });
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

      // Don't show error toast - just silently set to unknown
      setHealth({ status: "unknown" });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!tenant?.id) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      // First check if MCP is configured
      const isEnabled = await checkMcpConfig();

      if (!isEnabled) {
        // MCP not configured - set status and stop
        setHealth({ status: "not_configured" });
        setIsLoading(false);
        return;
      }

      // MCP is enabled, fetch health status
      await fetchHealthWithRetry(0, 3);

      // Subscribe to real-time updates for immediate health status changes
      channel = supabase
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
          if (status === 'SUBSCRIBED') {
            console.log('MCP health subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('MCP health channel error');
          }
        });
    };

    init();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
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
      case "not_configured":
        return "MCP Not Configured";
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
              (health.status === "unknown" || health.status === "not_configured") && "text-muted-foreground"
            )}
          >
            <div className={cn(
              "h-2 w-2 rounded-full",
              health.status === "online" && "bg-green-500",
              health.status === "offline" && "bg-red-500",
              health.status === "degraded" && "bg-yellow-500",
              (health.status === "unknown" || health.status === "not_configured") && "bg-muted-foreground/50"
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
