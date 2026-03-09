import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Lock, Unlock, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";

interface Operator {
  id: string;
  employee_id: string;
  full_name: string;
  active: boolean;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
}

interface OperatorsManagementProps {
  tenantId: string;
}

export default function OperatorsManagement({ tenantId }: OperatorsManagementProps) {
  const { t } = useTranslation();

  const [operators, setOperators] = useState<Operator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(true);
  const [operatorsError, setOperatorsError] = useState<string | null>(null);
  const [operatorDialogOpen, setOperatorDialogOpen] = useState(false);

  // Quick operator form
  const [operatorForm, setOperatorForm] = useState({
    full_name: "",
    employee_id: "",
    pin: "",
  });
  const [creatingOperator, setCreatingOperator] = useState(false);

  // Operator edit form
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [editOperatorDialogOpen, setEditOperatorDialogOpen] = useState(false);
  const [newPinForm, setNewPinForm] = useState({ pin: "" });
  const [resettingPin, setResettingPin] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    loadOperators();
  }, [tenantId]);

  const loadOperators = async () => {
    setOperatorsLoading(true);
    setOperatorsError(null);

    try {
      const { data, error } = await supabase.rpc('list_operators' as any);

      if (error) {
        logger.error('Users', 'Error loading operators', error);
        setOperatorsError(error.message);
        // Fallback: try direct table query
        const { data: directData, error: directError } = await supabase
          .from('operators')
          .select('id, employee_id, full_name, active, locked_until, last_login_at, created_at')
          .order('full_name');

        if (!directError && directData) {
          setOperators(directData as Operator[]);
          setOperatorsError(null);
        }
      } else if (data) {
        setOperators(data as Operator[]);
      }
    } catch (err: unknown) {
      logger.error('Users', 'Failed to load operators', err);
      setOperatorsError(err instanceof Error ? err.message : 'Failed to load operators');
    } finally {
      setOperatorsLoading(false);
    }
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operatorForm.full_name.trim()) {
      toast.error(t("users.enterOperatorName"));
      return;
    }

    if (!operatorForm.pin || operatorForm.pin.length < 4 || operatorForm.pin.length > 6) {
      toast.error(t("users.pinLength"));
      return;
    }

    if (!/^\d+$/.test(operatorForm.pin)) {
      toast.error(t("users.pinDigitsOnly"));
      return;
    }

    setCreatingOperator(true);

    try {
      // Use provided employee ID or let the RPC auto-generate
      const employeeIdParam = operatorForm.employee_id.trim() || null;

      logger.debug('Users', 'Creating operator with', {
        name: operatorForm.full_name.trim(),
        employeeId: employeeIdParam,
        pinLength: operatorForm.pin.length
      });

      const { data, error } = await supabase.rpc('create_operator_with_pin' as any, {
        p_full_name: operatorForm.full_name.trim(),
        p_pin: operatorForm.pin,
        p_employee_id: employeeIdParam,
      });

      logger.debug('Users', 'RPC result', { data, error });

      if (error) throw error;

      // Extract the employee_id from the result
      const result = Array.isArray(data) ? data[0] : data;
      const createdEmployeeId = result?.employee_id || employeeIdParam || 'Unknown';

      toast.success(t("notifications.created"), {
        duration: 5000,
      });

      setOperatorDialogOpen(false);
      setOperatorForm({
        full_name: "",
        employee_id: "",
        pin: "",
      });

      // Reload operators list
      await loadOperators();
    } catch (error: unknown) {
      logger.error('Users', 'Error creating operator', error);
      toast.error(error instanceof Error ? error.message : "Failed to create operator", {
        description: "Check the browser console for details.",
      });
    } finally {
      setCreatingOperator(false);
    }
  };

  const handleResetOperatorPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOperator) return;

    if (!newPinForm.pin || newPinForm.pin.length < 4 || newPinForm.pin.length > 6) {
      toast.error(t("users.pinLength"));
      return;
    }

    if (!/^\d+$/.test(newPinForm.pin)) {
      toast.error(t("users.pinDigitsOnly"));
      return;
    }

    setResettingPin(true);

    try {
      const { error } = await supabase.rpc('reset_operator_pin' as any, {
        p_operator_id: editingOperator.id,
        p_new_pin: newPinForm.pin,
      });

      if (error) throw error;

      toast.success(t("notifications.updated"));
      setEditOperatorDialogOpen(false);
      setEditingOperator(null);
      setNewPinForm({ pin: "" });
      await loadOperators();
    } catch (error: unknown) {
      logger.error('Users', 'Error resetting PIN', error);
      toast.error(error instanceof Error ? error.message : t("notifications.failed"));
    } finally {
      setResettingPin(false);
    }
  };

  const handleUnlockOperator = async (operatorId: string, operatorName: string) => {
    try {
      const { error } = await supabase.rpc('unlock_operator' as any, {
        p_operator_id: operatorId,
      });

      if (error) throw error;

      toast.success(t("notifications.updated"));
      await loadOperators();
    } catch (error: unknown) {
      logger.error('Users', 'Error unlocking operator', error);
      toast.error(error instanceof Error ? error.message : "Failed to unlock operator");
    }
  };

  const handleToggleOperatorActive = async (operatorId: string, currentActive: boolean, operatorName: string) => {
    try {
      const { error } = await supabase
        .from('operators')
        .update({ active: !currentActive })
        .eq('id', operatorId);

      if (error) throw error;

      toast.success(t("notifications.updated"));
      await loadOperators();
    } catch (error: unknown) {
      logger.error('Users', 'Error toggling operator status', error);
      toast.error(error instanceof Error ? error.message : t("notifications.failed"));
    }
  };

  return (
    <>
      {/* Create Operator (No Email) */}
      <Card className="glass-card border-primary/20 hover:border-primary/40 transition-colors">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            Create Operator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Quickly create an operator account with PIN login (no email required).
          </p>
          <Dialog open={operatorDialogOpen} onOpenChange={setOperatorDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <UserPlus className="h-4 w-4" />
                Create Now
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Operator</DialogTitle>
                <DialogDescription>
                  Create an operator account with PIN-based login.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateOperator} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="op_full_name">Full Name *</Label>
                  <Input
                    id="op_full_name"
                    value={operatorForm.full_name}
                    onChange={(e) => setOperatorForm({ ...operatorForm, full_name: e.target.value })}
                    placeholder="John Smith"
                    required
                    className="bg-[rgba(17,25,40,0.75)] border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="op_employee_id">
                    Employee ID{' '}
                    <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="op_employee_id"
                    value={operatorForm.employee_id}
                    onChange={(e) => setOperatorForm({ ...operatorForm, employee_id: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="bg-[rgba(17,25,40,0.75)] border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="op_pin">PIN (4-6 digits) *</Label>
                  <Input
                    id="op_pin"
                    type="password"
                    value={operatorForm.pin}
                    onChange={(e) => setOperatorForm({ ...operatorForm, pin: e.target.value })}
                    placeholder="1234"
                    required
                    minLength={4}
                    maxLength={6}
                    className="bg-[rgba(17,25,40,0.75)] border-white/10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Operators will use Employee ID + PIN to login
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full cta-button gap-2"
                  disabled={creatingOperator}
                >
                  {creatingOperator ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create Operator
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* PIN-Based Operators - Always show this section */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {t("users.shopFloorOperators")} ({operators.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("users.shopFloorOperatorsDescription")}
          </p>

          {operatorsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading operators...</span>
            </div>
          ) : operatorsError ? (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive">{operatorsError}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={loadOperators}>
                Retry
              </Button>
            </div>
          ) : operators.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <UserPlus className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-3">
                No shop floor operators created yet.
              </p>
              <Button
                variant="outline"
                onClick={() => setOperatorDialogOpen(true)}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Create First Operator
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {operators.map((op) => {
                const isLocked = op.locked_until && new Date(op.locked_until) > new Date();
                return (
                  <div key={op.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border-subtle">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${op.active ? 'bg-primary/10' : 'bg-muted/50'}`}>
                        <UserPlus className={`h-4 w-4 ${op.active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{op.full_name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{op.employee_id}</p>
                        {op.last_login_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("users.lastLogin")}: {new Date(op.last_login_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status badges */}
                      {isLocked ? (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <Lock className="h-3 w-3" />
                          {t("users.operatorLocked")}
                        </Badge>
                      ) : op.active ? (
                        <Badge variant="default" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">{t("users.active")}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">{t("users.inactive")}</Badge>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-2">
                        {/* Unlock button (only if locked) */}
                        {isLocked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlockOperator(op.id, op.full_name)}
                            className="h-8 w-8 p-0"
                            title="Unlock account"
                          >
                            <Unlock className="h-4 w-4 text-yellow-500" />
                          </Button>
                        )}

                        {/* Reset PIN button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingOperator(op);
                            setNewPinForm({ pin: "" });
                            setEditOperatorDialogOpen(true);
                          }}
                          className="h-8 w-8 p-0"
                          title="Reset PIN"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>

                        {/* Activate/Deactivate button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleOperatorActive(op.id, op.active, op.full_name)}
                          className="h-8 px-2 text-xs"
                        >
                          {op.active ? t("users.deactivate") : t("users.activate")}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Operator Dialog (Reset PIN) */}
      <Dialog open={editOperatorDialogOpen} onOpenChange={(open) => {
        setEditOperatorDialogOpen(open);
        if (!open) {
          setEditingOperator(null);
          setNewPinForm({ pin: "" });
        }
      }}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset PIN for {editingOperator?.full_name}
            </DialogTitle>
            <DialogDescription>
              Set a new PIN for this operator. They will need to use the new PIN to login.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetOperatorPin} className="space-y-4">
            <div className="p-3 bg-muted/20 rounded-lg space-y-1">
              <p className="text-sm font-medium">{editingOperator?.full_name}</p>
              <p className="text-xs text-muted-foreground font-mono">{editingOperator?.employee_id}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_pin">New PIN (4-6 digits) *</Label>
              <Input
                id="new_pin"
                type="password"
                value={newPinForm.pin}
                onChange={(e) => setNewPinForm({ pin: e.target.value })}
                placeholder="Enter new PIN"
                required
                minLength={4}
                maxLength={6}
                className="bg-[rgba(17,25,40,0.75)] border-white/10"
              />
            </div>

            <Button type="submit" className="w-full cta-button gap-2" disabled={resettingPin}>
              {resettingPin ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Reset PIN
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
