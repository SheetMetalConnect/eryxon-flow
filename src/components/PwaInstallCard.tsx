import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePwaInstall } from "@/hooks/usePwaInstall"
import { Smartphone, Download, Monitor, ExternalLink, CheckCircle2, XCircle } from "lucide-react"

export function PwaInstallCard() {
  const { t } = useTranslation()
  const { state, canInstall, install, isInstalled, dismissedBefore } = usePwaInstall()

  if (isInstalled || state === "unsupported" || state === "loading") return null

  const handleInstall = async () => {
    if (install) {
      await install()
    }
  }

  const getIcon = () => {
    switch (state) {
      case "installable":
        return Download
      case "manual-ipad":
        return Monitor
      case "manual-ios":
        return ExternalLink
      case "installed":
        return CheckCircle2
      default:
        return Smartphone
    }
  }

  const Icon = getIcon()

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          {t("pwa.install.title")}
        </CardTitle>
        <CardDescription>
          {t("pwa.install.settingsDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state === "installable" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("pwa.install.settingsPrompt")}
            </p>
            <Button onClick={handleInstall} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {t("pwa.install.installButton")}
            </Button>
          </div>
        )}

        {(state === "manual-ios" || state === "manual-ipad") && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("pwa.install.settingsManualPrompt")}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(state === "manual-ipad" ? "pwa.install.manualIPad" : "pwa.install.manualIOS")}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
