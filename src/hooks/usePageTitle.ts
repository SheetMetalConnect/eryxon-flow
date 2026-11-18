import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const BASE_TITLE = "Eryxon Flow";

/**
 * Localized per-page document title ("Work Queue · Eryxon Flow") so the tab
 * switcher, browser history, and PWA window show where the user actually is.
 * Restores the base title on unmount and re-renders on language change.
 */
export function usePageTitle(titleKey: string): void {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = `${t(titleKey)} · ${BASE_TITLE}`;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [t, titleKey, i18n.language]);
}
