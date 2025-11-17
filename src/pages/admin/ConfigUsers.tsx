import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    role: "operator" as "operator" | "admin",
    is_machine: false,
  });

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
        // Create new user - generate username from email
        const username = formData.email.split('@')[0];

        const { data: authData, error: authError } = await supabase.auth.signUp({
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("users.title")}</h1>
            <p className="text-muted-foreground">{t("users.manageUsers")}</p>
          </div>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.username")}</TableHead>
                  <TableHead>{t("users.fullName")}</TableHead>
                  <TableHead>{t("users.email")}</TableHead>
                  <TableHead>{t("users.role")}</TableHead>
                  <TableHead>{t("users.status")}</TableHead>
                  <TableHead>{t("users.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      {user.full_name}
                      {user.is_machine && (
                        <Badge variant="outline" className="ml-2">{t("users.machine")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {t(`users.roles.${user.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "default" : "secondary"}>
                        {user.active ? t("users.active") : t("users.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(user.id, user.active)}
                        >
                          {user.active ? t("users.deactivate") : t("users.activate")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
