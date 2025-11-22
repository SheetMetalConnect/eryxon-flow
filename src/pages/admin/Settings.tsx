import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import {
  Moon,
  Globe,
  Shield,
  User,
  Building,
  ExternalLink,
  Database,
  Trash2,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import { generateMockData, clearMockData } from "@/lib/mockDataGenerator";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { profile, tenant } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleSeedData = async () => {
    if (!tenant?.id) return;
    
    setIsSeeding(true);
    try {
      const result = await generateMockData(tenant.id, {
        includeCells: true,
        includeJobs: true,
        includeParts: true,
        includeOperations: true,
        includeResources: true,
        includeOperators: true,
      });

      if (result.success) {
        toast.success("Demo data seeded successfully! Includes 3 jobs, 5 parts, operations, 4 operators, and 9 resources.");
      } else {
        toast.error(result.error || "Failed to seed demo data");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to seed demo data");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    if (!tenant?.id) return;
    
    setIsClearing(true);
    try {
      const result = await clearMockData(tenant.id);

      if (result.success) {
        toast.success("Demo data cleared successfully!");
        setShowClearDialog(false);
      } else {
        toast.error(result.error || "Failed to clear demo data");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to clear demo data");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("navigation.settings")}</h1>
        <p className="text-muted-foreground">
          Manage your application preferences and account settings
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Eryxon MES uses a beautiful dark mode interface optimized for operators and admins
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
            <CardDescription>
              Your account information
            </CardDescription>
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
              <p className="font-medium capitalize">{profile?.role || "Not set"}</p>
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
              <CardDescription>
                Your organization details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Company Name</Label>
                <p className="font-medium">{tenant.company_name || tenant.name}</p>
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

      {/* Demo Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Demo Data
          </CardTitle>
          <CardDescription>
            Seed or clear demo data for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleSeedData} 
              disabled={isSeeding}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {isSeeding ? "Seeding..." : "Seed Demo Data"}
            </Button>
            <Button 
              onClick={() => setShowClearDialog(true)} 
              disabled={isClearing}
              variant="destructive"
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Demo Data
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Seed creates 6 cells, 3 jobs, 5 parts with operations, 4 demo operators, and 9 resources. Clear removes all demo data.
          </p>
        </CardContent>
      </Card>

      {/* Quick Links to Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configuration
          </CardTitle>
          <CardDescription>
            Quick access to configuration pages
          </CardDescription>
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

      {/* Clear Data Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all demo data including jobs, parts, operations, cells, resources, and demo operators. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData} disabled={isClearing}>
              {isClearing ? "Clearing..." : "Clear All Demo Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
