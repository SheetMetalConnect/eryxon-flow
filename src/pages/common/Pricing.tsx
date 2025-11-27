import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Mail, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Pricing() {
  const { t } = useTranslation();

  const handleContactUs = () => {
    window.location.href = `mailto:office@sheetmetalconnect.com?subject=${encodeURIComponent('Pricing Inquiry')}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">{t("pricing.title")}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {t("pricing.comingSoonSubtitle")}
        </p>
      </div>

      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-primary/20">
        <CardContent className="p-8 text-center">
          <Clock className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-3">{t("pricing.comingSoonTitle")}</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            {t("pricing.comingSoonDescription")}
          </p>
          <Button size="lg" onClick={handleContactUs}>
            <Mail className="h-4 w-4 mr-2" />
            {t("pricing.contactUs")}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Shield className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold">{t("pricing.securityBanner.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("pricing.securityBanner.description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("pricing.howItWorks.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">{t("pricing.howItWorks.selfServiceTitle")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("pricing.howItWorks.selfServiceDescription")}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">{t("pricing.howItWorks.upgradeTitle")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("pricing.howItWorks.upgradeDescription")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
