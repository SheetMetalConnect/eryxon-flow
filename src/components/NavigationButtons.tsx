import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NavigationButtons() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="h-7 w-7 p-0"
        title={t("common.goBack")}
        aria-label={t("common.goBack")}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(1)}
        className="h-7 w-7 p-0"
        title={t("common.goForward", "Go Forward")}
        aria-label={t("common.goForward", "Go Forward")}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
