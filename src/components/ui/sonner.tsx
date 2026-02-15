import { useThemeMode } from "@/theme/ThemeProvider";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useThemeMode();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      richColors
      closeButton
      visibleToasts={5}
      gap={8}
      toastOptions={{
        duration: 5000,
        classNames: {
          toast:
            "group toast group-[.toaster]:backdrop-blur-xl group-[.toaster]:bg-background/95 group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl sonner-toast-progress",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          closeButton:
            "group-[.toast]:bg-background/80 group-[.toast]:border-border/50 group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:!bg-emerald-500/10 group-[.toaster]:!border-emerald-500/30 group-[.toaster]:!text-foreground [&_[data-close-button]]:!bg-emerald-500/10 sonner-toast-success",
          error:
            "group-[.toaster]:!bg-red-500/10 group-[.toaster]:!border-red-500/30 group-[.toaster]:!text-foreground [&_[data-close-button]]:!bg-red-500/10 sonner-toast-error",
          warning:
            "group-[.toaster]:!bg-amber-500/10 group-[.toaster]:!border-amber-500/30 group-[.toaster]:!text-foreground [&_[data-close-button]]:!bg-amber-500/10 sonner-toast-warning",
          info:
            "group-[.toaster]:!bg-blue-500/10 group-[.toaster]:!border-blue-500/30 group-[.toaster]:!text-foreground [&_[data-close-button]]:!bg-blue-500/10 sonner-toast-info",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
