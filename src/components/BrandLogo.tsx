import { useAuth } from "@/contexts/AuthContext";
import { Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface BrandLogoProps {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  textClassName?: string;
  iconClassName?: string;
}

/**
 * BrandLogo component that respects tenant whitelabeling settings.
 * Premium/enterprise tenants can customize logo, app name, and colors.
 * Falls back to default branding for non-premium tenants.
 */
export function BrandLogo({
  showText = true,
  size = "md",
  className,
  textClassName,
  iconClassName,
}: BrandLogoProps) {
  const { t } = useTranslation();
  const { tenant } = useAuth();

  // Check if tenant has premium features (premium plan or higher)
  const hasPremiumFeatures = tenant?.plan === "premium";

  // Use custom branding if available and tenant is premium
  const logoUrl = hasPremiumFeatures ? tenant?.logo_url : null;
  const appName = hasPremiumFeatures && tenant?.app_name ? tenant.app_name : t("app.name");
  const primaryColor = hasPremiumFeatures ? tenant?.primary_color : null;

  // Size configurations
  const sizeConfig = {
    sm: {
      container: "h-7 w-7",
      icon: "h-5 w-5",
      text: "text-sm",
      logo: "h-7 w-7",
    },
    md: {
      container: "h-9 w-9",
      icon: "h-6 w-6",
      text: "text-lg",
      logo: "h-9 w-9",
    },
    lg: {
      container: "h-12 w-12",
      icon: "h-8 w-8",
      text: "text-xl",
      logo: "h-12 w-12",
    },
  };

  const config = sizeConfig[size];

  // Dynamic styles for custom primary color
  const customColorStyle = primaryColor
    ? { color: primaryColor }
    : undefined;

  const customBgStyle = primaryColor
    ? { background: `linear-gradient(135deg, ${primaryColor}40, ${primaryColor})` }
    : undefined;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {logoUrl ? (
        // Custom logo from tenant whitelabeling
        <img
          src={logoUrl}
          alt={appName}
          className={cn(
            config.logo,
            "rounded-lg object-contain",
            iconClassName
          )}
        />
      ) : (
        // Default logo with Factory icon
        <div
          className={cn(
            config.container,
            "rounded-lg flex items-center justify-center",
            !customBgStyle && "bg-gradient-to-br from-[#3a4656] to-[#0080ff]",
            iconClassName
          )}
          style={customBgStyle}
        >
          <Factory
            className={cn(config.icon, "text-white")}
            strokeWidth={1.5}
          />
        </div>
      )}
      {showText && (
        <span
          className={cn(
            config.text,
            "font-bold tracking-tight",
            !customColorStyle && "hero-title",
            textClassName
          )}
          style={customColorStyle}
        >
          {appName}
        </span>
      )}
    </div>
  );
}

export default BrandLogo;
