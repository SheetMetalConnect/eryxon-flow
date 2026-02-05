import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const SELF_HOSTING_GUIDE_URL =
  "https://github.com/SheetMetalConnect/eryxon-flow/blob/main/docs/SELF_HOSTING_GUIDE.md";

export function TrialStatusBanner() {
  const { t } = useTranslation();
  const { tenant } = useAuth();

  if (!tenant) return null;

  const isTrial = tenant.status === "trial" || tenant.plan === "free";
  if (!isTrial) return null;

  const trialEndsAt = tenant.trial_ends_at
    ? new Date(tenant.trial_ends_at)
    : null;
  const now = new Date();
  const isExpired = trialEndsAt ? trialEndsAt < now : false;

  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const isUrgent = daysRemaining !== null && daysRemaining <= 7;

  const formattedDate = trialEndsAt
    ? trialEndsAt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div
      className={cn(
        "w-full px-3 py-2 flex items-center gap-3 text-xs border-b",
        isExpired
          ? "bg-destructive/10 border-destructive/20 text-destructive"
          : isUrgent
            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
            : "bg-primary/5 border-primary/20 text-muted-foreground"
      )}
    >
      {isExpired ? (
        <AlertTriangle className="h-4 w-4 shrink-0" />
      ) : (
        <Clock className="h-4 w-4 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <span className="font-medium">
          {isExpired
            ? t("trialBanner.expired")
            : formattedDate
              ? t("trialBanner.titleWithDate", { date: formattedDate })
              : t("trialBanner.title")}
        </span>
        {daysRemaining !== null && !isExpired && (
          <span className={cn(
            "ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
            isUrgent
              ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
              : "bg-primary/10 text-primary"
          )}>
            {t("trialBanner.daysRemaining", { count: daysRemaining })}
          </span>
        )}
        <span className="hidden sm:inline ml-2 text-muted-foreground">
          {isExpired
            ? t("trialBanner.expiredDescription")
            : t("trialBanner.description")}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/admin/my-plan"
          className="text-xs font-medium hover:underline whitespace-nowrap"
        >
          {t("trialBanner.viewPlan")}
        </Link>
        <a
          href={SELF_HOSTING_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
            isExpired
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : isUrgent
                ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/30"
                : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          {t("trialBanner.upgradeCta")}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
