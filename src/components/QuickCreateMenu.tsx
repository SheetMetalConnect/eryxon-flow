"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Briefcase,
  Package,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface QuickCreateMenuProps {
  className?: string;
}

export const QuickCreateMenu: React.FC<QuickCreateMenuProps> = ({ className }) => {
  const navigate = useNavigate();

  const menuItems = [
    {
      label: "Job",
      icon: Briefcase,
      action: () => navigate("/admin/jobs/new"),
      shortcut: "⌘N J",
    },
    {
      label: "Part",
      icon: Package,
      action: () => navigate("/admin/parts"),
      shortcut: "⌘N P",
    },
    {
      label: "Assignment",
      icon: ClipboardCheck,
      action: () => navigate("/admin/assignments"),
      shortcut: "",
    },
    {
      label: "Issue",
      icon: AlertTriangle,
      action: () => navigate("/admin/issues"),
      shortcut: "",
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 bg-primary/10 hover:bg-primary/20",
            className
          )}
          aria-label="Quick create"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(
          "w-56",
          "bg-[rgba(20,20,20,0.95)] backdrop-blur-xl",
          "border border-white/10",
          "shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        )}
      >
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Create New
        </DropdownMenuLabel>

        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.label}
              onClick={item.action}
              className="cursor-pointer gap-3 focus:bg-white/10"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 font-medium">{item.label}</span>
              {item.shortcut && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-muted-foreground">
                  {item.shortcut}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
