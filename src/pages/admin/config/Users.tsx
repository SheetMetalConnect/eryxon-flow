import { useEffect, useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Loader2, Mail, Users, Copy, Bot, Key } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "@/components/ui/data-table/DataTableColumnHeader";
import type { DataTableFilterableColumn } from "@/components/ui/data-table/DataTable";
import { useInvitations, Invitation } from "@/hooks/useInvitations";
import { PendingInvitations } from "@/components/admin/config/PendingInvitations";
import { logger } from "@/lib/logger";
import OperatorsManagement from "@/components/admin/config/OperatorsManagement";

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
  const profile = useProfile();
  const { invitations, createInvitation, cancelInvitation, loading: invitationsLoading } = useInvitations();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    role: "operator" as "operator" | "admin",
    is_machine: false,
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"operator" | "admin">("operator");
  const [inviting, setInviting] = useState(false);

  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [machineForm, setMachineForm] = useState({
    name: "",
    machine_id: "",
    description: "",
  });
  const [creatingMachine, setCreatingMachine] = useState(false);
  const [createdMachineApiKey, setCreatedMachineApiKey] = useState<string | null>(null);

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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("users.failedToSaveUser"));
      logger.error('Users', 'Failed to save user', error);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      toast.error(t("users.enterEmail"));
      return;
    }

    setInviting(true);
    try {
      const result = await createInvitation(inviteEmail, inviteRole);
      if (result) {
        setInviteDialogOpen(false);
        setInviteEmail('');
        setInviteRole('operator');
        // Toast is already shown by createInvitation
      }
    } catch (error: unknown) {
      // Error toast already shown by createInvitation
      logger.error('Users', 'Invitation error', error);
    } finally {
      setInviting(false);
    }
  };

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!machineForm.name.trim()) {
      toast.error(t("users.enterMachineName"));
      return;
    }

    if (!machineForm.machine_id.trim()) {
      toast.error(t("users.enterMachineId"));
      return;
    }

    setCreatingMachine(true);
    setCreatedMachineApiKey(null);

    try {
      const { data, error } = await supabase.rpc('create_machine_worker' as any, {
        p_name: machineForm.name,
        p_machine_id: machineForm.machine_id,
        p_description: machineForm.description || null,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const { api_key } = data[0];
        setCreatedMachineApiKey(api_key);
        toast.success(t("notifications.created"));
      }

      loadUsers();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("notifications.failed"));
      logger.error('Users', 'Error creating machine worker', error);
    } finally {
      setCreatingMachine(false);
    }
  };

  const resetMachineForm = () => {
    setMachineForm({
      name: "",
      machine_id: "",
      description: "",
    });
    setCreatedMachineApiKey(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            {t("users.title")}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">{t("users.manageUsers")}</p>
        </div>
      </div>

      <hr className="title-divider" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        <Card className="glass-card border-blue-500/20 hover:border-blue-500/40 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Bot className="h-5 w-5 text-blue-500" />
              </div>
              {t("users.createMachine")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("users.createMachineDescription")}
            </p>
            <Dialog open={machineDialogOpen} onOpenChange={(open) => {
              setMachineDialogOpen(open);
              if (!open) resetMachineForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Bot className="h-4 w-4" />
                  {t("users.createMachineNow")}
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("users.createMachineTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("users.createMachineSubtitle")}
                  </DialogDescription>
                </DialogHeader>

                {createdMachineApiKey ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-green-500">
                        <Key className="h-5 w-5" />
                        <span className="font-semibold">{t("users.machineCreatedSuccess")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("users.machineApiKeyWarning")}
                      </p>
                      <div className="p-3 bg-background/50 rounded font-mono text-sm break-all">
                        {createdMachineApiKey}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => {
                          navigator.clipboard.writeText(createdMachineApiKey);
                          toast.success(t("users.apiKeyCopied"));
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        {t("users.copyApiKey")}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        resetMachineForm();
                        setMachineDialogOpen(false);
                      }}
                    >
                      {t("common.done")}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateMachine} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="machine_name">{t("users.machineName")} *</Label>
                      <Input
                        id="machine_name"
                        value={machineForm.name}
                        onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
                        placeholder={t("users.machineNamePlaceholder")}
                        required
                        className="bg-[rgba(17,25,40,0.75)] border-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="machine_id">{t("users.machineId")} *</Label>
                      <Input
                        id="machine_id"
                        value={machineForm.machine_id}
                        onChange={(e) => setMachineForm({ ...machineForm, machine_id: e.target.value })}
                        placeholder={t("users.machineIdPlaceholder")}
                        required
                        className="bg-[rgba(17,25,40,0.75)] border-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="machine_description">
                        {t("users.machineDescription")}{' '}
                        <span className="text-muted-foreground text-xs">({t("common.optional")})</span>
                      </Label>
                      <Input
                        id="machine_description"
                        value={machineForm.description}
                        onChange={(e) => setMachineForm({ ...machineForm, description: e.target.value })}
                        placeholder={t("users.machineDescriptionPlaceholder")}
                        className="bg-[rgba(17,25,40,0.75)] border-white/10"
                      />
                    </div>

                    <div className="p-3 bg-muted/10 rounded-lg text-sm text-muted-foreground">
                      {t("users.machineApiKeyNote")}
                    </div>

                    <Button
                      type="submit"
                      className="w-full cta-button gap-2"
                      disabled={creatingMachine}
                    >
                      {creatingMachine ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("common.creating")}
                        </>
                      ) : (
                        <>
                          <Bot className="h-4 w-4" />
                          {t("users.createMachineWorker")}
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-card border-muted/30 hover:border-muted/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted/10">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              {t("users.advancedOptions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("users.advancedOptionsDescription")}
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

      <PendingInvitations invitations={invitations} onCancel={cancelInvitation} />

      {profile?.tenant_id && <OperatorsManagement tenantId={profile.tenant_id} />}

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
