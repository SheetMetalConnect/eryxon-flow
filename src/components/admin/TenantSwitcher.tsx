"use client";

import * as React from "react";
import { Building2, CheckCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Tenant {
  id: string;
  name: string;
  company_name: string | null;
  plan: "free" | "pro" | "premium";
  status: "active" | "cancelled" | "suspended" | "trial";
  user_count: number;
  created_at: string;
}

interface TenantSwitcherProps {
  open: boolean;
  onClose: () => void;
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({
  open,
  onClose,
}) => {
  const { profile, tenant, switchTenant } = useAuth();
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [switching, setSwitching] = React.useState(false);

  React.useEffect(() => {
    if (open && profile?.is_root_admin) {
      loadTenants();
    }
  }, [open, profile?.is_root_admin]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_all_tenants");

      if (error) throw error;

      setTenants(data || []);
    } catch (error) {
      console.error("Error loading tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    if (switching) return;

    setSwitching(true);
    try {
      await switchTenant(tenantId);
      onClose();
    } catch (error) {
      console.error("Error switching tenant:", error);
      setSwitching(false);
    }
  };

  const getPlanStyles = (plan: string) => {
    switch (plan) {
      case "premium":
        return "bg-purple-600 text-white";
      case "pro":
        return "bg-violet-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case "premium":
        return "Premium";
      case "pro":
        return "Pro";
      default:
        return "Free";
    }
  };

  if (!profile?.is_root_admin) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          "max-w-md p-0",
          "bg-[rgba(20,20,20,0.95)] backdrop-blur-xl",
          "border border-white/10",
          "shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        )}
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Switch Tenant
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Select a tenant to switch context
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {tenants.map((t) => {
                  const isActive = t.id === tenant?.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSwitchTenant(t.id)}
                      disabled={switching}
                      className={cn(
                        "w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all",
                        "border hover:bg-white/5",
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-white/10"
                      )}
                    >
                      <Building2
                        className={cn(
                          "h-5 w-5 mt-0.5",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-medium truncate",
                              isActive && "text-primary"
                            )}
                          >
                            {t.company_name || t.name}
                          </span>
                          {isActive && (
                            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge
                            className={cn(
                              "text-[10px] font-semibold px-1.5 py-0 h-5",
                              getPlanStyles(t.plan)
                            )}
                          >
                            {getPlanLabel(t.plan)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {t.user_count} user{t.user_count !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {t.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
