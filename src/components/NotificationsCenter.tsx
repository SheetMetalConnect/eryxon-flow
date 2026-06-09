"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  Package,
  UserPlus,
  Info,
  CheckCircle,
  Pin,
  PinOff,
  X,
  Circle,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/time-utils";
import { useNotifications } from "@/hooks/useNotifications";
import { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

interface NotificationsCenterProps {
  className?: string;
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const [currentTab, setCurrentTab] = React.useState<"all" | "pinned">("all");
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const {
    notifications,
    loading,
    unreadCount,
    pinnedNotifications,
    unpinnedNotifications,
    markAsRead,
    togglePin,
    dismiss,
    markAllAsRead,
  } = useNotifications();

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    }

    setOpen(false);
  };

  const handleTogglePin = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await togglePin(notificationId);
  };

  const handleDismiss = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await dismiss(notificationId);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await markAsRead(notificationId);
  };

  const getIcon = (type: string, severity: string) => {
    const colorClass =
      severity === "high"
        ? "text-red-500"
        : severity === "medium"
        ? "text-yellow-500"
        : "text-green-500";

    const iconProps = { className: cn("h-4 w-4", colorClass) };

    switch (type) {
      case "issue":
        return <AlertTriangle {...iconProps} />;
      case "job_due":
        return <Clock {...iconProps} />;
      case "assignment":
        return <ClipboardCheck {...iconProps} />;
      case "new_part":
      case "part_completed":
        return <Package {...iconProps} />;
      case "new_user":
        return <UserPlus {...iconProps} />;
      case "system":
        return <Info {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };


  const getSeverityBadge = (severity: string) => {
    const colors = {
      high: "bg-red-500/10 text-red-500 border-red-500/30",
      medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
      low: "bg-green-500/10 text-green-500 border-green-500/30",
    };

    return (
      <span
        className={cn(
          "px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded border",
          colors[severity as keyof typeof colors] || colors.low
        )}
      >
        {severity}
      </span>
    );
  };

  const renderNotificationItem = (notification: Notification) => (
    <div
      key={notification.id}
      onClick={() => handleNotificationClick(notification)}
      className={cn(
        "flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors",
        "border-l-2 hover:bg-white/5",
        !notification.read
          ? notification.severity === "high"
            ? "border-l-red-500 bg-primary/5"
            : notification.severity === "medium"
            ? "border-l-yellow-500 bg-primary/5"
            : "border-l-green-500 bg-primary/5"
          : "border-l-transparent"
      )}
    >
      <span className="mt-0.5">{getIcon(notification.type, notification.severity)}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm truncate flex-1">
            {notification.title}
          </span>
          {getSeverityBadge(notification.severity)}
        </div>

        <p className="text-xs text-muted-foreground truncate max-w-[280px]">
          {notification.message}
        </p>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground/70">
            {formatRelativeTime(notification.created_at, i18n.language)}
          </span>
          {notification.pinned && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
              <Pin className="h-2.5 w-2.5" />
              {t("notifications.pinnedLabel")}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5">
        <TooltipProvider>
          {!notification.read && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-white/10"
                  onClick={(e) => handleMarkAsRead(e, notification.id)}
                >
                  <Circle className="h-2 w-2 fill-primary text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("notifications.markAsRead")}</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-white/10"
                onClick={(e) => handleTogglePin(e, notification.id)}
              >
                {notification.pinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {notification.pinned ? t("notifications.unpin") : t("notifications.pin")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-white/10"
                onClick={(e) => handleDismiss(e, notification.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("notifications.dismiss")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  const displayNotifications =
    currentTab === "pinned"
      ? pinnedNotifications
      : [...pinnedNotifications, ...unpinnedNotifications];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative h-9 w-9 hover:bg-white/10", className)}
          aria-label={t("notifications.ariaLabel", { count: unreadCount })}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className={cn(
          "w-[420px] max-w-[90vw] p-0",
          "bg-[rgba(20,20,20,0.95)] backdrop-blur-xl",
          "border border-white/10",
          "shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">
              {t("notifications.center")}{" "}
              {unreadCount > 0 && (
                <span className="text-muted-foreground">
                  {t("notifications.unreadCount", { count: unreadCount })}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-white/10"
                      onClick={markAllAsRead}
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("notifications.markAllAsRead")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Tabs */}
          <Tabs
            value={currentTab}
            onValueChange={(v) => setCurrentTab(v as "all" | "pinned")}
            className="mt-2"
          >
            <TabsList className="h-8 w-full bg-white/5">
              <TabsTrigger value="all" className="flex-1 text-xs h-7">
                {t("notifications.tabAll")} ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="pinned" className="flex-1 text-xs h-7">
                {t("notifications.pinnedLabel")} ({pinnedNotifications.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[450px]">
          {loading ? (
            <div className="py-12 text-center">
              <Spinner size="lg" className="mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">
                {t("notifications.loadingCenter")}
              </p>
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {currentTab === "pinned"
                  ? t("notifications.emptyPinned")
                  : t("notifications.caughtUp")}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {currentTab === "pinned"
                  ? t("notifications.pinHint")
                  : t("notifications.empty")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {displayNotifications.map(renderNotificationItem)}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {displayNotifications.length > 0 && (
          <div className="px-4 py-2 border-t border-white/10 text-center">
            <p className="text-[10px] text-muted-foreground/70">
              {t("notifications.footerHint")}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
