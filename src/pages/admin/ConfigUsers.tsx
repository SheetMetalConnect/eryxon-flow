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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Loader2, Mail, UserPlus } from "lucide-react";
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
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    role: "operator" as "operator" | "admin",
    is_machine: false,
    no_email_login: false,
    employee_id: "",
    pin: "",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"operator" | "admin">("operator");

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
        if (formData.no_email_login) {
          // Create operator with PIN (no email)
          const employeeId = formData.employee_id || `OPR-${Date.now().toString().slice(-6)}`;

          const { error } = await supabase.rpc('create_operator_with_pin', {
            p_full_name: formData.full_name,
            p_employee_id: employeeId,
            p_pin: formData.pin,
            p_role: formData.role,
          });

          if (error) throw error;
          toast.success(`Operator created: ${employeeId}`);
        } else {
          // Create new user with email - generate username from email
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

    await createInvitation(inviteEmail, inviteRole);
    setInviteDialogOpen(false);
    setInviteEmail('');
    setInviteRole('operator');
  };

  const resetForm = () => {
    setFormData({
      username: "",
      full_name: "",
      email: "",
      password: "",
      role: "operator",
      is_machine: false,
      no_email_login: false,
      employee_id: "",
      pin: "",
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
            <Badge variant="outline">{t("users.machine")}</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("users.email")} />
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
          <Badge variant={active ? "default" : "secondary"}>
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(user);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleActive(user.id, user.active);
              }}
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
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("users.title")}</h1>
            <p className="text-muted-foreground">{t("users.manageUsers")}</p>
          </div>

          <div className="flex gap-2">
            {/* Invite User Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email Address *</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteRole">Role *</Label>
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

                  <Button onClick={handleSendInvite} className="w-full gap-2">
                    <Mail className="h-4 w-4" />
                    Send Invitation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Create User Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("users.createUser")}
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? t("users.editUser") : t("users.createNewUser")}
                </DialogTitle>
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
                  />
                </div>

                {!editingUser && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <Label htmlFor="no_email_login">Operator without Email (PIN Login)</Label>
                      <Switch
                        id="no_email_login"
                        checked={formData.no_email_login}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, no_email_login: checked })
                        }
                      />
                    </div>

                    {formData.no_email_login ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="employee_id">
                            Employee ID{' '}
                            <span className="text-muted-foreground text-xs">(auto-generated if empty)</span>
                          </Label>
                          <Input
                            id="employee_id"
                            value={formData.employee_id}
                            onChange={(e) =>
                              setFormData({ ...formData, employee_id: e.target.value })
                            }
                            placeholder="OPR-123456"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="pin">PIN (4-6 digits) *</Label>
                          <Input
                            id="pin"
                            type="password"
                            value={formData.pin}
                            onChange={(e) =>
                              setFormData({ ...formData, pin: e.target.value })
                            }
                            required
                            minLength={4}
                            maxLength={6}
                            placeholder="1234"
                          />
                        </div>
                      </>
                    ) : (
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
                          />
                        </div>
                      </>
                    )}
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

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_machine">{t("users.machineAutomatedProcess")}</Label>
                  <Switch
                    id="is_machine"
                    checked={formData.is_machine}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_machine: checked })
                    }
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editingUser ? t("users.updateUser") : t("users.createUser")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("users.title")}</CardTitle>
          </CardHeader>
          <CardContent>
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
