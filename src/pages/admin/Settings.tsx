import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { generateMockData, clearMockData } from "@/lib/mockDataGenerator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Moon,
  Globe,
  Shield,
  User,
  Building,
  ExternalLink,
  TestTube,
  Loader2,
  AlertTriangle,
  Trash2,
  UserX,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { profile, tenant, signOut } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showDeleteTenantDialog, setShowDeleteTenantDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeletingTenant, setIsDeletingTenant] = useState(false);

  useEffect(() => {
    if (!profile?.tenant_id) return;

    supabase
      .rpc("is_demo_mode", { p_tenant_id: profile.tenant_id })
      .then(({ data }) => setIsDemoMode(data === true));
  }, [profile?.tenant_id]);

  const handleCreateDemoData = async () => {
    if (!profile?.tenant_id) return;

    setIsLoading(true);
    const result = await generateMockData(profile.tenant_id);

    if (result.success) {
      toast.success("Demo data created successfully");
      setIsDemoMode(true);
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to create demo data");
    }
    setIsLoading(false);
  };

  const handleClearDemoData = async () => {
    if (!profile?.tenant_id) return;

    setIsLoading(true);
    const result = await clearMockData(profile.tenant_id);

    if (result.success) {
      toast.success("Demo data cleared successfully");
      setIsDemoMode(false);
      setShowExitDialog(false);
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to clear demo data");
    }
    setIsLoading(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { data, error } = await supabase.rpc('delete_user_account');

      if (error) throw error;

      toast.success("Account deleted successfully");
      // User will be automatically signed out by the database function
      // Wait a moment then sign out explicitly
      setTimeout(async () => {
        await signOut();
      }, 1000);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error.message || "Failed to delete account");
      setIsDeletingAccount(false);
      setShowDeleteAccountDialog(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!tenant?.id) return;

    setIsDeletingTenant(true);
    try {
      const { data, error } = await supabase.rpc('delete_tenant_data', {
        p_tenant_id: tenant.id
      });

      if (error) throw error;

      toast.success("Tenant deleted successfully");
      // All users will be deleted, so sign out
      setTimeout(async () => {
        await signOut();
      }, 1000);
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error(error.message || "Failed to delete tenant");
      setIsDeletingTenant(false);
      setShowDeleteTenantDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {/* Demo Data Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              {t("settings.demoData.title")}
            </CardTitle>
            {isDemoMode && (
              <Badge variant="secondary">{t("settings.demoData.active")}</Badge>
            )}
          </div>
          <CardDescription>
            {t("settings.demoData.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDemoMode ? (
            <>
              <Alert>
                <AlertDescription>
                  {t("settings.demoData.activeDescription")}
                </AlertDescription>
              </Alert>
              <Button
                variant="destructive"
                onClick={() => setShowExitDialog(true)}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("settings.demoData.clearing")}
                  </>
                ) : (
                  t("settings.demoData.clearButton")
                )}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t("settings.demoData.createDescription")}
              </p>
              <Button
                onClick={handleCreateDemoData}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("settings.demoData.creating")}
                  </>
                ) : (
                  t("settings.demoData.createButton")
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Eryxon MES uses a beautiful dark mode interface optimized for
              operators and admins
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Always enabled for optimal visibility and reduced eye strain
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Moon className="h-4 w-4" />
                <span className="font-medium">Enabled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Language
            </CardTitle>
            <CardDescription>
              Choose your preferred language for the interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Interface Language</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred language
                </p>
              </div>
              <LanguageSwitcher />
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Full Name</Label>
              <p className="font-medium">{profile?.full_name || "Not set"}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium">{profile?.email || "Not set"}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Role</Label>
              <p className="font-medium capitalize">
                {profile?.role || "Not set"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Organization Info */}
        {tenant && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization
              </CardTitle>
              <CardDescription>Your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">
                  Company Name
                </Label>
                <p className="font-medium">
                  {tenant.company_name || tenant.name}
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Plan</Label>
                <p className="font-medium capitalize">{tenant.plan}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Status</Label>
                <p className="font-medium capitalize">{tenant.status}</p>
              </div>
              <Link to="/admin/my-plan">
                <Button variant="outline" size="sm" className="mt-2 w-full">
                  Manage Subscription
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Links to Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configuration
          </CardTitle>
          <CardDescription>Quick access to configuration pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/admin/config/users">
              <Button variant="outline" className="w-full justify-start">
                <User className="h-4 w-4 mr-2" />
                Users
              </Button>
            </Link>
            <Link to="/admin/config/stages">
              <Button variant="outline" className="w-full justify-start">
                Cells
              </Button>
            </Link>
            <Link to="/admin/config/materials">
              <Button variant="outline" className="w-full justify-start">
                Materials
              </Button>
            </Link>
            <Link to="/admin/config/resources">
              <Button variant="outline" className="w-full justify-start">
                Resources
              </Button>
            </Link>
            <Link to="/admin/config/api-keys">
              <Button variant="outline" className="w-full justify-start">
                API Keys
              </Button>
            </Link>
            <Link to="/admin/config/webhooks">
              <Button variant="outline" className="w-full justify-start">
                Webhooks
              </Button>
            </Link>
            <Link to="/admin/data-export">
              <Button variant="outline" className="w-full justify-start">
                Data Export
              </Button>
            </Link>
            <Link to="/admin/config/steps-templates">
              <Button variant="outline" className="w-full justify-start">
                Templates
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* GDPR Compliance: Data Deletion */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {t("settings.gdpr.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.gdpr.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delete Account */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">{t("settings.gdpr.deleteAccount.title")}</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t("settings.gdpr.deleteAccount.description")}
              </p>
            </div>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("settings.gdpr.deleteAccount.warning")}</AlertTitle>
              <AlertDescription>
                {t("settings.gdpr.deleteAccount.warningMessage")}
              </AlertDescription>
            </Alert>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAccountDialog(true)}
              className="w-full"
            >
              <UserX className="h-4 w-4 mr-2" />
              {t("settings.gdpr.deleteAccount.button")}
            </Button>
          </div>

          {/* Delete Tenant (Admin Only) */}
          {profile?.role === 'admin' && (
            <>
              <Separator />
              <div className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">{t("settings.gdpr.deleteTenant.title")}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("settings.gdpr.deleteTenant.description")}
                  </p>
                </div>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t("settings.gdpr.deleteTenant.warningTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("settings.gdpr.deleteTenant.warningMessage")}
                  </AlertDescription>
                </Alert>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteTenantDialog(true)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("settings.gdpr.deleteTenant.button")}
                </Button>
              </div>
            </>
          )}

          <Alert>
            <AlertDescription className="text-xs">
              {t("settings.gdpr.exportFirst")}{" "}
              <Link to="/admin/data-export" className="underline">
                {t("settings.gdpr.dataExportLink")}
              </Link>.
              {" "}{t("settings.gdpr.seePolicy")}{" "}
              <Link to="/privacy-policy" className="underline">
                {t("settings.gdpr.privacyPolicyLink")}
              </Link>.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.gdpr.deleteAccount.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.gdpr.deleteAccount.confirmMessage")}
              <ul className="mt-3 space-y-1 text-sm list-disc list-inside">
                <li>{t("settings.gdpr.deleteAccount.confirmItems.profile")}</li>
                <li>{t("settings.gdpr.deleteAccount.confirmItems.timeEntries")}</li>
                <li>{t("settings.gdpr.deleteAccount.confirmItems.assignments")}</li>
                <li>{t("settings.gdpr.deleteAccount.confirmItems.issues")}</li>
              </ul>
              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("settings.gdpr.deleteAccount.confirmWarning")}</AlertTitle>
                <AlertDescription>
                  {t("settings.gdpr.deleteAccount.confirmDescription")}
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAccount}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("settings.gdpr.deleteAccount.deleting")}
                </>
              ) : (
                t("settings.gdpr.deleteAccount.confirmButton")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Tenant Confirmation Dialog */}
      <AlertDialog open={showDeleteTenantDialog} onOpenChange={setShowDeleteTenantDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.gdpr.deleteTenant.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.gdpr.deleteTenant.confirmMessage")}
              <ul className="mt-3 space-y-1 text-sm list-disc list-inside">
                <li>{t("settings.gdpr.deleteTenant.confirmItems.users")}</li>
                <li>{t("settings.gdpr.deleteTenant.confirmItems.jobs")}</li>
                <li>{t("settings.gdpr.deleteTenant.confirmItems.timeEntries")}</li>
                <li>{t("settings.gdpr.deleteTenant.confirmItems.issues")}</li>
                <li>{t("settings.gdpr.deleteTenant.confirmItems.config")}</li>
                <li>{t("settings.gdpr.deleteTenant.confirmItems.api")}</li>
                <li>{t("settings.gdpr.deleteTenant.confirmItems.all")}</li>
              </ul>
              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("settings.gdpr.deleteTenant.confirmWarningTitle")}</AlertTitle>
                <AlertDescription>
                  {t("settings.gdpr.deleteTenant.confirmWarningMessage")}
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTenant}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTenant}
              disabled={isDeletingTenant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingTenant ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("settings.gdpr.deleteTenant.deleting")}
                </>
              ) : (
                t("settings.gdpr.deleteTenant.confirmButton")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Demo Mode Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.demoData.confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.demoData.confirmDescription")}
              <ul className="mt-3 space-y-1 text-sm list-disc list-inside">
                <li>{t("settings.demoData.confirmItems.operators")}</li>
                <li>{t("settings.demoData.confirmItems.jobs")}</li>
                <li>{t("settings.demoData.confirmItems.parts")}</li>
                <li>{t("settings.demoData.confirmItems.operations")}</li>
                <li>{t("settings.demoData.confirmItems.records")}</li>
              </ul>
              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("settings.demoData.confirmWarning")}</AlertTitle>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              {t("settings.demoData.confirmCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearDemoData}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading
                ? t("settings.demoData.confirmClearing")
                : t("settings.demoData.confirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
