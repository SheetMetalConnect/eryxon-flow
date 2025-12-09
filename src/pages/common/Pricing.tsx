import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Server, Cloud, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Pricing() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">{t("pricing.title")}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {t("pricing.subtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Hosted Demo */}
        <Card className="border-white/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cloud className="h-6 w-6 text-muted-foreground" />
              <CardTitle className="text-muted-foreground">{t("pricing.hostedDemo.name")}</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">{t("pricing.hostedDemo.description")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {(t("pricing.hostedDemo.features", { returnObjects: true }) as string[]).map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground italic">
              {t("pricing.hostedDemo.note")}
            </p>
          </CardContent>
        </Card>

        {/* Self-Hosted */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-6 w-6 text-primary" />
              <CardTitle>{t("pricing.selfHosted.name")}</CardTitle>
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                {t("pricing.recommended")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t("pricing.selfHosted.description")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {(t("pricing.selfHosted.features", { returnObjects: true }) as string[]).map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="w-full">
              <a
                href="https://github.com/SheetMetalConnect/eryxon-flow/blob/main/docs/SELF_HOSTING_GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("pricing.selfHosted.getStarted")}
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* License Info */}
      <Card className="max-w-4xl mx-auto bg-white/5 border-white/10">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">{t("pricing.license.title")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("pricing.license.tldr")}
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-green-500 mb-2">{t("pricing.license.allowed")}</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• {t("pricing.license.allowedItems.selfHost")}</li>
                <li>• {t("pricing.license.allowedItems.modify")}</li>
                <li>• {t("pricing.license.allowedItems.consulting")}</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-red-500 mb-2">{t("pricing.license.notAllowed")}</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• {t("pricing.license.notAllowedItems.resell")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-muted-foreground mb-4">
          {t("pricing.needHelp")}
        </p>
        <Button variant="outline" asChild>
          <a href="https://www.sheetmetalconnect.com/" target="_blank" rel="noopener noreferrer">
            {t("pricing.contactUs")}
            <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
}
