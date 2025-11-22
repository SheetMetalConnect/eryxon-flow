import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

/**
 * Real-time toast notifications for MCP events
 * Displays toasts when MCP tools are executed
 */
export function McpActivityToasts() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.tenant_id) return;

    // Subscribe to activity log changes for MCP events
    const channel = supabase
      .channel("mcp_activity_toasts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          const activity = payload.new as any;

          // Only show toasts for MCP actions
          if (activity.action === "mcp_execute") {
            const metadata = activity.metadata || {};
            const toolName = activity.entity_name || metadata.tool_name || "Unknown Tool";
            const responseTime = metadata.response_time_ms;

            toast.success(
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">MCP Tool Executed</div>
                  <div className="text-sm text-muted-foreground">
                    {activity.description ||
                      `Tool "${toolName}" executed successfully`}
                  </div>
                  {responseTime && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Response time: {responseTime}ms
                    </div>
                  )}
                </div>
                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
              </div>,
              {
                duration: 4000,
                className: "border-purple-500/20 bg-purple-500/5",
              }
            );
          } else if (activity.action === "mcp_error") {
            const metadata = activity.metadata || {};
            const toolName = activity.entity_name || metadata.tool_name || "Unknown Tool";
            const errorMessage = metadata.error_message;

            toast.error(
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">MCP Tool Failed</div>
                  <div className="text-sm text-muted-foreground">
                    {activity.description || `Tool "${toolName}" execution failed`}
                  </div>
                  {errorMessage && (
                    <div className="text-xs text-muted-foreground mt-1 font-mono bg-black/20 p-1 rounded">
                      {errorMessage}
                    </div>
                  )}
                </div>
                <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              </div>,
              {
                duration: 6000,
                className: "border-red-500/20 bg-red-500/5",
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id]);

  // This component doesn't render anything visible
  return null;
}
