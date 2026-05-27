import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePwaInstall } from "@/hooks/usePwaInstall"
import { Smartphone, Download, Monitor, ExternalLink, CheckCircle2, XCircle } from "lucide-react"
import { type LucideIcon } from "lucide-react"

interface PwaInstallStepProps {
  onComplete: () => void
  onSkip: () => void
}

interface InstallOption {
  icon: LucideIcon
  titleKey: string
  descriptionKey: string
  instructionsKey: string
}

function ManualInstructions({ deviceKey }: { deviceKey: "ios" | "ipad" }) {
  const { t } = useTranslation()
  const isIPad = deviceKey === "ipad"

  const steps = [
    t(isIPad ? "pwa.install.manual.ipad.step1" : "pwa.install.manual.ios.step1"),
    t(isIPad ? "pwa.install.manual.ipad.step2" : "pwa.install.manual.ios.step2"),
    t(isIPad ? "pwa.install.manual.ipad.step3" : "pwa.install.manual.ios.step3"),
    t(isIPad ? "pwa.install.manual.ipad.step4" : "pwa.install.manual.ios.step4"),
  ]

  return (
    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground text-left">
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  )
}

export function PwaInstallStep({ onComplete, onSkip }: PwaInstallStepProps) {
  const { t } = useTranslation()
  const { state, canInstall, install, isInstalled, dismissedBefore } = usePwaInstall()

  const handleInstall = async () => {
    if (install) {
      await install()
    }
  }

  const getStateContent = () => {
    if (state === "loading") {
      return {
        icon: Smartphone,
        title: "pwa.install.checking",
        description: "pwa.install.checkingDesc",
      }
    }

    if (isInstalled) {
      return {
        icon: CheckCircle2,
        title: "pwa.install.installed",
        description: "pwa.install.installedDesc",
      }
    }

    if (state === "installable") {
      return {
        icon: Download,
        title: "pwa.install.installable",
        description: "pwa.install.installableDesc",
      }
    }

    if (state === "manual-ipad") {
      return {
        icon: Monitor,
        title: "pwa.install.manualIPad",
        description: "pwa.install.manualDesc",
      }
    }

    if (state === "manual-ios") {
      return {
        icon: ExternalLink,
        title: "pwa.install.manualIOS",
        description: "pwa.install.manualDesc",
      }
    }

    return {
      icon: XCircle,
      title: "pwa.install.notSupported",
      description: "pwa.install.notSupportedDesc",
    }
  }

  const stateContent = getStateContent()
  const StateIcon = stateContent.icon

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <StateIcon className="h-16 w-16 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t(stateContent.title)}</CardTitle>
        <CardDescription className="text-base">
          {t(stateContent.description)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {state === "installable" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {t("pwa.install.installPrompt")}
            </p>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={handleInstall} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                {t("pwa.install.installButton")}
              </Button>
              <Button variant="outline" size="lg" onClick={onSkip} className="w-full">
                {t("pwa.install.remindLater")}
              </Button>
            </div>
          </div>
        )}

        {(state === "manual-ios" || state === "manual-ipad") && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {t("pwa.install.manualPrompt")}
            </p>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                {t("pwa.install.manualInstructions")}
              </h4>
              <ManualInstructions deviceKey={state === "manual-ipad" ? "ipad" : "ios"} />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button variant="outline" size="lg" onClick={onSkip} className="w-full">
                {t("pwa.install.remindLater")}
              </Button>
            </div>
          </div>
        )}

        {state === "unsupported" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {t("pwa.install.notSupportedHint")}
            </p>
            <Button size="lg" onClick={onComplete} className="w-full">
              {t("pwa.install.continue")}
            </Button>
          </div>
        )}

        {state === "loading" && (
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {isInstalled && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {t("pwa.install.installedMessage")}
            </p>
            <Button size="lg" onClick={onComplete} className="w-full">
              {t("pwa.install.continue")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
