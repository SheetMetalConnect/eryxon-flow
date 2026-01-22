import * as React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface BrandLogoProps {
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show the text name alongside the logo */
  showName?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Override default color scheme (for headers with specific backgrounds) */
  variant?: "default" | "light" | "dark";
}

const sizeConfig = {
  sm: {
    logo: "h-8 w-8",
    text: "text-sm",
    fontSize: "text-xs",
  },
  md: {
    logo: "h-9 w-9",
    text: "text-lg",
    fontSize: "text-sm",
  },
  lg: {
    logo: "h-10 w-10",
    text: "text-xl",
    fontSize: "text-base",
  },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  showName = true,
  className,
  variant = "default",
}) => {
  const { t } = useTranslation();
  const { tenant } = useAuth();

  const config = sizeConfig[size];

  // Check if whitelabeling is enabled and tenant has custom settings
  const isWhitelabeled = tenant?.whitelabel_enabled === true;
  const customLogo = isWhitelabeled ? tenant?.whitelabel_logo_url : null;
  const customAppName = isWhitelabeled ? tenant?.whitelabel_app_name : null;
  const customPrimaryColor = isWhitelabeled ? tenant?.whitelabel_primary_color : null;

  // Determine the app name to display
  const displayName = customAppName || t("app.name");

  // Get text color based on variant
  const textColorClass = variant === "light"
    ? "text-white"
    : variant === "dark"
      ? "text-foreground"
      : "text-foreground";

  // Default logo gradient or custom primary color
  const defaultGradient = "bg-gradient-to-br from-[#3a4656] to-[#0080ff]";
  const customBgStyle = customPrimaryColor
    ? { backgroundColor: customPrimaryColor }
    : undefined;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Logo */}
      {customLogo ? (
        // Custom logo from whitelabeling
        <img
          src={customLogo}
          alt={displayName}
          className={cn(config.logo, "rounded-lg object-contain")}
        />
      ) : (
        // Default logo badge with initials
        <div
          className={cn(
            config.logo,
            "rounded-lg flex items-center justify-center",
            !customPrimaryColor && defaultGradient,
            "text-white font-bold",
            config.fontSize
          )}
          style={customBgStyle}
        >
          SM
        </div>
      )}

      {/* Brand Name */}
      {showName && (
        <span
          className={cn(
            "hidden sm:block font-bold tracking-tight",
            config.text,
            textColorClass
          )}
        >
          {displayName}
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
