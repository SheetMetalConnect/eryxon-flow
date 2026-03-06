import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { logger } from "@/lib/logger";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    logger.warn('Router', '404: User accessed non-existent route', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('common.pageNotFound')}</p>
        <a href="/" className="text-primary underline hover:text-primary/80">
          {t('common.returnToHome')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
