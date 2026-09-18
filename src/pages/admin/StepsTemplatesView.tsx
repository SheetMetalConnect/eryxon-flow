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
    <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            {t("templates.title")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("templates.subtitle")}
          </p>
        </div>

        <hr className="title-divider" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">
              {t("templates.tabTemplates")}
            </TabsTrigger>
            <TabsTrigger value="substeps">
              {t("templates.tabSubsteps")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>{t("templates.cardTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("templates.cardDescription")}
                </p>
              </CardHeader>
              <CardContent>
                <TemplatesManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="substeps" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>{t("substeps.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("substeps.subtitle")}
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
