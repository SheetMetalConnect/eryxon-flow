import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplatesManager } from "@/components/admin/TemplatesManager";
import { AllSubstepsView } from "@/components/admin/AllSubstepsView";
import { useTranslation } from "react-i18next";

export default function StepsTemplatesView() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("Steps & Templates")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("Manage substep templates and view all substeps across your operations")}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">
              {t("Templates")}
            </TabsTrigger>
            <TabsTrigger value="substeps">
              {t("All Substeps")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("Substep Templates")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("Create and manage reusable templates for common operations. Templates help operators quickly add standardized substeps to any operation.")}
                </p>
              </CardHeader>
              <CardContent>
                <TemplatesManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="substeps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("All Substeps")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("View and manage all substeps across all operations in your system")}
                </p>
              </CardHeader>
              <CardContent>
                <AllSubstepsView />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
