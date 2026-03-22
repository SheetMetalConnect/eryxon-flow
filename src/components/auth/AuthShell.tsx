import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  children: ReactNode;
  topRight?: ReactNode;
  containerClassName?: string;
  cardClassName?: string;
}

interface AuthCardHeaderProps {
  icon: LucideIcon;
  title: string;
  appName?: string;
  badge?: string;
  eyebrow?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  iconClassName?: string;
}

export function AuthShell({
  children,
  topRight,
  containerClassName,
  cardClassName,
}: AuthShellProps) {
  return (
    <>
      <AnimatedBackground />
      <div className={cn("landing-container", containerClassName)}>
        {topRight && <div className="absolute top-4 right-4 z-10">{topRight}</div>}
        <div className={cn("onboarding-card", cardClassName)}>{children}</div>
      </div>
    </>
  );
}

export function AuthCardHeader({
  icon: Icon,
  title,
  appName,
  badge,
  eyebrow,
  description,
  descriptionClassName,
  iconClassName,
}: AuthCardHeaderProps) {
  return (
    <>
      <div className="icon-container">
        <Icon
          className={cn("browser-icon text-primary", iconClassName)}
          strokeWidth={1.5}
        />
      </div>

      {eyebrow && <p className="welcome-text">{eyebrow}</p>}

      {(appName || badge) && (
        <div className="title-container">
          {appName && <h1 className="main-title">{appName}</h1>}
          {badge && <p className="preview-pill">{badge}</p>}
        </div>
      )}

      <hr className="title-divider" />

      <h2 className="hero-title">{title}</h2>

      {description && (
        <div className={cn("text-left", descriptionClassName ?? "informational-text")}>
          {description}
        </div>
      )}
    </>
  );
}
