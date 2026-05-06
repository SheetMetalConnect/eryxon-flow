"use client";

import * as React from "react";
import { Building2, CheckCircle, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useTenant } from "@/hooks/useTenant";
import { useAuthActions } from "@/hooks/useAuthActions";

interface Tenant {
  id: string;
  name: string;
  company_name: string | null;
  plan: "free" | "pro" | "premium" | "enterprise";
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
  const profile = useProfile();
  const { tenant } = useTenant();
  const { switchTenant } = useAuthActions();
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [switching, setSwitching] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const STATUS_ORDER: Record<string, number> = {
    active: 0,
    trial: 1,
    suspended: 2,
    cancelled: 3,
    expired: 3,
  };

  const filteredTenants = React.useMemo(() => {
    const q = search.toLowerCase();
    return tenants
      .filter((t) => {
        if (!q) return true;
        return (
          (t.company_name || "").toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  }, [tenants, search]);

  React.useEffect(() => {
    if (open && profile?.is_root_admin) {
      setSearch("");
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
      logger.error('TenantSwitcher', 'Error loading tenants', error);
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
      logger.error('TenantSwitcher', 'Error switching tenant', error);
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
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10"
            />
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {filteredTenants.map((t) => {
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
