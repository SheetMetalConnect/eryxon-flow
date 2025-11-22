import { useEffect, useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Loader2, Mail, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DataTable, DataTableColumnHeader, DataTableFilterableColumn } from "@/components/ui/data-table";
import { useInvitations } from "@/hooks/useInvitations";

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: "operator" | "admin";
  active: boolean;
  is_machine: boolean;
}

export default function ConfigUsers() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { createInvitation } = useInvitations();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [operatorDialogOpen, setOperatorDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    role: "operator" as "operator" | "admin",
    is_machine: false,
  });

  // Quick invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"operator" | "admin">("operator");
  const [inviting, setInviting] = useState(false);

  // Quick operator form
  const [operatorForm, setOperatorForm] = useState({
    full_name: "",
    employee_id: "",
    pin: "",
  });
  const [creatingOperator, setCreatingOperator] = useState(false);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    loadUsers();
  }, [profile?.tenant_id]);

  const loadUsers = async () => {
    if (!profile?.tenant_id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("full_name");

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    try {
      if (editingUser) {
        // Update existing user
        await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            role: formData.role,
            is_machine: formData.is_machine,
          })
          .eq("id", editingUser.id);

        toast.success(t("users.userUpdated"));
      } else {
        // Create new user with email
        const username = formData.email.split('@')[0];

        const { error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              username,
              full_name: formData.full_name,
              role: formData.role,
              tenant_id: profile.tenant_id,
              is_machine: formData.is_machine,
            },
          },
        });

        if (authError) throw authError;
        toast.success(t("users.userCreated"));
      }

      setDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || t("users.failedToSaveUser"));
      console.error(error);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setInviting(true);
    try {
      await createInvitation(inviteEmail, inviteRole);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('operator');
      toast.success('Invitation sent successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operatorForm.full_name.trim()) {
      toast.error("Please enter operator name");
      return;
    }

    if (!operatorForm.pin || operatorForm.pin.length < 4 || operatorForm.pin.length > 6) {
      toast.error("PIN must be 4-6 digits");
      return;
    }

    if (!/^\d+$/.test(operatorForm.pin)) {
      toast.error("PIN must contain only numbers");
      return;
    }

    setCreatingOperator(true);

    try {
      const employeeId = operatorForm.employee_id.trim() || `OPR-${Date.now().toString().slice(-6)}`;

      const { error } = await supabase.rpc('create_operator_with_pin' as any, {
        p_full_name: operatorForm.full_name,
        p_employee_id: employeeId,
        p_pin: operatorForm.pin,
        p_role: 'operator',
      });

      if (error) throw error;

      toast.success(`Operator created: ${employeeId}`);
      setOperatorDialogOpen(false);
      setOperatorForm({
        full_name: "",
        employee_id: "",
        pin: "",
      });
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to create operator");
      console.error("Error creating operator:", error);
    } finally {
      setCreatingOperator(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      full_name: "",
      email: "",
      password: "",
      role: "operator",
      is_machine: false,
    });
    setEditingUser(null);
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
      is_machine: user.is_machine,
    });
    setDialogOpen(true);
  };

  const toggleActive = async (userId: string, currentActive: boolean) => {
    await supabase
      .from("profiles")
      .update({ active: !currentActive })
      .eq("id", userId);

    toast.success(t(!currentActive ? "users.userActivated" : "users.userDeactivated"));
    loadUsers();
  };

  const columns: ColumnDef<UserProfile>[] = useMemo(() => [
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("users.username")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("username")}</span>
      ),
    },
    {
      accessorKey: "full_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("users.fullName")} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.getValue("full_name")}
          {row.original.is_machine && (
            <Badge variant="outline" className="text-xs">{t("users.machine")}</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("users.email")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("users.role")} />
      ),
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return (
          <Badge variant={role === "admin" ? "default" : "secondary"}>
            {t(`users.roles.${role}`)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "active",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("users.status")} />
      ),
      cell: ({ row }) => {
        const active = row.getValue("active") as boolean;
        return (
          <Badge variant={active ? "default" : "secondary"} className="text-xs">
            {active ? t("users.active") : t("users.inactive")}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        const active = row.getValue(id) as boolean;
        return value.includes(active ? "active" : "inactive");
      },
    },
    {
      id: "actions",
      header: t("users.actions"),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(user);
              }}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleActive(user.id, user.active);
              }}
              className="h-8 px-2 text-xs"
            >
              {user.active ? t("users.deactivate") : t("users.activate")}
            </Button>
          </div>
        );
      },
    },
  ], [t]);

  const filterableColumns: DataTableFilterableColumn[] = useMemo(() => [
    {
      id: "role",
      title: t("users.role"),
      options: [
        { label: t("users.roles.admin"), value: "admin" },
        { label: t("users.roles.operator"), value: "operator" },
      ],
    },
    {
      id: "active",
      title: t("users.status"),
      options: [
        { label: t("users.active"), value: "active" },
        { label: t("users.inactive"), value: "inactive" },
      ],
    },
  ], [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            {t("users.title")}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">{t("users.manageUsers")}</p>
        </div>
      </div>

      <hr className="title-divider" />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Invite Team Member */}
        <Card className="glass-card border-primary/20 hover:border-primary/40 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              Invite Team Member
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Send an email invitation to a colleague to join your organization.
            </p>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Mail className="h-4 w-4" />
                  Send Invite
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation email to add a new team member.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email Address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="bg-[rgba(17,25,40,0.75)] border-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteRole">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(value: "operator" | "admin") => setInviteRole(value)}
                    >
                      <SelectTrigger id="inviteRole">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operator">Operator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleSendInvite}
                    className="w-full cta-button gap-2"
                    disabled={inviting}
                  >
                    {inviting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

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

        {/* Advanced User Creation */}
        <Card className="glass-card border-muted/30 hover:border-muted/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted/10">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              Advanced Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Create users with custom settings and machine accounts.
            </p>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  {t("users.createUser")}
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? t("users.editUser") : t("users.createNewUser")}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser ? "Update user information" : "Create a new user with email login"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">{t("users.fullName")} *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      required
                      placeholder={t("users.fullNamePlaceholder")}
                      className="bg-[rgba(17,25,40,0.75)] border-white/10"
                    />
                  </div>

                  {!editingUser && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("users.email")} *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          required
                          placeholder={t("users.emailPlaceholder")}
                          className="bg-[rgba(17,25,40,0.75)] border-white/10"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("users.usernameAutoGenerated")}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">{t("users.password")} *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          required
                          minLength={6}
                          placeholder={t("users.passwordPlaceholder")}
                          className="bg-[rgba(17,25,40,0.75)] border-white/10"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="role">{t("users.role")} *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "operator" | "admin") =>
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operator">{t("users.roles.operator")}</SelectItem>
                        <SelectItem value="admin">{t("users.roles.admin")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                    <Label htmlFor="is_machine" className="text-sm">{t("users.machineAutomatedProcess")}</Label>
                    <Switch
                      id="is_machine"
                      checked={formData.is_machine}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_machine: checked })
                      }
                    />
                  </div>

                  <Button type="submit" className="w-full cta-button">
                    {editingUser ? t("users.updateUser") : t("users.createUser")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <DataTable
            columns={columns}
            data={users}
            filterableColumns={filterableColumns}
            searchPlaceholder={t("users.searchUsers") || "Search users..."}
            pageSize={10}
            emptyMessage={t("users.noUsersFound") || "No users found."}
          />
        </CardContent>
      </Card>
    </div>
  );
}
