import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useOperator } from "@/contexts/OperatorContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, LogOut, RefreshCw } from "lucide-react";
import { ROUTES } from "@/routes";
import { cn } from "@/lib/utils";

interface OperatorSwitcherProps {
  variant?: "dropdown" | "button" | "compact";
  className?: string;
}

/**
 * OperatorSwitcher Component
 *
 * Displays the currently active operator and provides quick access
 * to switch operators. Used in the operator layout header and footer.
 */
export function OperatorSwitcher({ variant = "dropdown", className }: OperatorSwitcherProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeOperator, clearActiveOperator } = useOperator();

  const handleSwitchOperator = () => {
    navigate(ROUTES.OPERATOR.LOGIN);
  };

  const handleClockOut = () => {
    clearActiveOperator();
    navigate(ROUTES.OPERATOR.LOGIN);
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Compact button variant (just icon)
  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSwitchOperator}
        className={cn("h-8 w-8 p-0 rounded-full", className)}
        title={activeOperator ? `${activeOperator.full_name} - ${t("operator.switchOperator")}` : t("operator.selectOperator")}
      >
        {activeOperator ? (
          <Avatar className="h-7 w-7 border border-primary/30">
            <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold text-xs">
              {getInitials(activeOperator.full_name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Users className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    );
  }

  // Simple button variant
  if (variant === "button") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleSwitchOperator}
        className={cn("gap-2", className)}
      >
        <RefreshCw className="h-4 w-4" />
        {activeOperator ? (
          <span className="truncate max-w-[120px]">{activeOperator.full_name}</span>
        ) : (
          t("operator.selectOperator")
        )}
      </Button>
    );
  }

  // Full dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-2 h-9 px-2", className)}
        >
          {activeOperator ? (
            <>
              <Avatar className="h-6 w-6 border border-green-500/30">
                <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold text-[10px]">
                  {getInitials(activeOperator.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-medium truncate max-w-[100px]">
                  {activeOperator.full_name}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {activeOperator.employee_id}
                </span>
              </div>
            </>
          ) : (
            <>
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">
                {t("operator.selectOperator")}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56 glass-card" align="end">
        {activeOperator ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-green-500/30">
                  <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold">
                    {getInitials(activeOperator.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {activeOperator.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {activeOperator.employee_id}
                  </p>
                  <Badge
                    variant="outline"
                    className="w-fit text-[10px] bg-green-500/10 text-green-500 border-green-500/30"
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    {t("operator.clockedIn")}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleSwitchOperator}
              className="gap-2 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              {t("operator.switchOperator")}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleClockOut}
              className="gap-2 cursor-pointer text-orange-500 focus:text-orange-500"
            >
              <LogOut className="h-4 w-4" />
              {t("operator.clockOut")}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                {t("operator.noOperatorSelected")}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleSwitchOperator}
              className="gap-2 cursor-pointer"
            >
              <UserCheck className="h-4 w-4" />
              {t("operator.selectOperator")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Inline operator display for headers/footers
 */
export function ActiveOperatorBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeOperator } = useOperator();

  if (!activeOperator) return null;

  return (
    <button
      onClick={() => navigate(ROUTES.OPERATOR.LOGIN)}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-green-500/10 border border-green-500/30 hover:bg-green-500/20",
        "transition-colors cursor-pointer",
        className
      )}
    >
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <span className="text-xs font-medium text-green-500">
        {activeOperator.full_name}
      </span>
      <span className="text-[10px] text-green-500/70 font-mono">
        ({activeOperator.employee_id})
      </span>
    </button>
  );
}
