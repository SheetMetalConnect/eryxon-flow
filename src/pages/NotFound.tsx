import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Compass, ArrowLeft, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    logger.warn("Router", "404: User accessed non-existent route", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-xl rounded-3xl border-border/80 bg-card/95 p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/30">
            <Compass className="h-8 w-8 text-primary" />
          </div>
          <div className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            404
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {t("common.pageNotFound")}
          </h1>
          <p className="mt-2 max-w-md break-words whitespace-normal text-sm text-muted-foreground">
            {location.pathname}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Button onClick={() => navigate(-1)} variant="outline" className="min-h-11 rounded-xl px-4">
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("common.goBack")}
            </Button>
            <Button asChild className="min-h-11 rounded-xl px-4">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.returnToHome")}
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;
