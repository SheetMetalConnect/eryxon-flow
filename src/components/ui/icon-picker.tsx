import * as React from "react";
import * as icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Curated list of commonly used icons for manufacturing/workflow contexts
// Organized by category for better UX
export const ICON_CATEGORIES = {
  "Manufacturing & Tools": [
    "Factory", "Wrench", "Hammer", "Settings", "Cog", "Drill", "Ruler",
    "Boxes", "Package", "Container", "Truck", "Warehouse", "HardHat",
  ],
  "Workflow & Status": [
    "PlayCircle", "PauseCircle", "StopCircle", "CheckCircle", "CheckCircle2",
    "XCircle", "AlertCircle", "AlertTriangle", "Clock", "Timer", "Hourglass",
    "RefreshCw", "RotateCw", "ArrowRight", "ArrowLeft", "TrendingUp",
  ],
  "Actions": [
    "Plus", "Minus", "Edit", "Trash2", "Save", "Copy", "Download", "Upload",
    "Send", "Share2", "Link", "Unlink", "Eye", "EyeOff", "Lock", "Unlock",
  ],
  "Organization": [
    "Folder", "FolderOpen", "File", "FileText", "ClipboardList", "ListChecks",
    "Calendar", "CalendarDays", "MapPin", "Tag", "Tags", "Bookmark",
  ],
  "Users & Teams": [
    "User", "Users", "UserCheck", "UserPlus", "UserMinus", "UserCircle",
    "Shield", "ShieldCheck", "Award", "Star",
  ],
  "Technology": [
    "Cpu", "HardDrive", "Server", "Database", "Cloud", "Wifi", "Radio",
    "Bluetooth", "Usb", "Power", "Battery", "BatteryCharging",
  ],
  "Quality & Testing": [
    "Search", "ScanSearch", "CheckSquare", "Square", "SquareCheck",
    "CircleDot", "Target", "Crosshair", "Microscope", "FlaskConical",
  ],
  "Data & Analytics": [
    "BarChart", "BarChart2", "BarChart3", "LineChart", "PieChart",
    "TrendingUp", "Activity", "Gauge", "Signal",
  ],
  "Common": [
    "Home", "Building", "Building2", "Briefcase", "Package2", "ShoppingCart",
    "Layers", "Grid3x3", "LayoutGrid", "LayoutList", "Box", "Cube",
  ],
} as const;

// Flatten all icons for easy searching
export const ALL_ICONS = Object.values(ICON_CATEGORIES).flat();

export interface IconPickerProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function IconPicker({ value, onValueChange, placeholder = "Select icon...", className }: IconPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Get the icon component
  const SelectedIcon = (value && value in icons ? icons[value as keyof typeof icons] : null) as React.ComponentType<{ className?: string }> | null;

  // Filter icons based on search
  const filteredCategories = React.useMemo(() => {
    if (!search) return ICON_CATEGORIES;

    const filtered: Record<string, string[]> = {};
    const searchLower = search.toLowerCase();

    Object.entries(ICON_CATEGORIES).forEach(([category, iconList]) => {
      const matchingIcons = iconList.filter(icon =>
        icon.toLowerCase().includes(searchLower)
      );
      if (matchingIcons.length > 0) {
        filtered[category] = matchingIcons;
      }
    });

    return filtered;
  }, [search]);

  const handleSelect = (iconName: string) => {
    onValueChange?.(iconName);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-start", className)}
        >
          {SelectedIcon ? (
            <div className="flex items-center gap-2">
              <SelectedIcon className="h-4 w-4" />
              <span>{value}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search icons..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>No icon found.</CommandEmpty>
            {Object.entries(filteredCategories).map(([category, iconList]) => (
              <CommandGroup key={category} heading={category}>
                <div className="grid grid-cols-6 gap-1 p-2">
                  {iconList.map((iconName) => {
                    const IconComponent = icons[iconName as keyof typeof icons] as React.ComponentType<{ className?: string }>;
                    if (!IconComponent) return null;

                    return (
                      <CommandItem
                        key={iconName}
                        value={iconName}
                        onSelect={() => handleSelect(iconName)}
                        className="flex flex-col items-center justify-center h-16 cursor-pointer hover:bg-accent rounded-md"
                      >
                        <IconComponent className="h-5 w-5 mb-1" />
                        <span className="text-[10px] text-center leading-tight">{iconName}</span>
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Helper component to display an icon by name
interface IconDisplayProps {
  iconName?: string | null;
  className?: string;
  fallback?: React.ReactNode;
}

export function IconDisplay({ iconName, className, fallback }: IconDisplayProps) {
  if (!iconName) {
    return fallback || null;
  }

  const IconComponent = (iconName in icons ? icons[iconName as keyof typeof icons] : null) as React.ComponentType<{ className?: string }> | null;

  if (!IconComponent) {
    return fallback || null;
  }

  return <IconComponent className={className} />;
}

// Type helper for icon name validation
export type IconName = typeof ALL_ICONS[number];
