import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeMode, type ThemeMode } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown' | 'buttons';
  className?: string;
  showLabel?: boolean;
}

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'auto', label: 'System', icon: Monitor },
];

/**
 * ThemeToggle Component
 *
 * Provides three modes of theme selection:
 * - 'icon': Click to cycle through themes (default)
 * - 'dropdown': Dropdown menu with all options
 * - 'buttons': Three buttons side by side
 */
export function ThemeToggle({
  variant = 'dropdown',
  className,
  showLabel = false,
}: ThemeToggleProps) {
  const { mode, resolvedTheme, setTheme, toggleTheme } = useThemeMode();

  // Get current theme icon based on mode
  const getCurrentIcon = () => {
    if (mode === 'auto') return Monitor;
    return mode === 'dark' ? Moon : Sun;
  };

  const CurrentIcon = getCurrentIcon();

  // Icon variant - click to cycle
  if (variant === 'icon') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              'h-9 w-9 rounded-lg transition-colors',
              'hover:bg-muted',
              className
            )}
            aria-label={`Current theme: ${mode}. Click to change.`}
          >
            <CurrentIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Theme: {mode === 'auto' ? `Auto (${resolvedTheme})` : mode}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Buttons variant - three buttons side by side
  if (variant === 'buttons') {
    return (
      <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-muted/50', className)}>
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <Button
                variant={mode === value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTheme(value)}
                className={cn(
                  'h-8 px-3 gap-1.5',
                  mode === value && 'bg-primary text-primary-foreground'
                )}
                aria-label={`Set theme to ${label}`}
              >
                <Icon className="h-4 w-4" />
                {showLabel && <span className="text-xs">{label}</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-9 w-9 rounded-lg transition-colors',
            'hover:bg-muted',
            className
          )}
          aria-label="Toggle theme"
        >
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              mode === value && 'bg-accent'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {mode === value && (
              <span className="ml-auto text-xs text-muted-foreground">
                {value === 'auto' ? `(${resolvedTheme})` : ''}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Compact theme toggle for sidebar
 */
export function SidebarThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { mode, resolvedTheme, setTheme } = useThemeMode();

  const getCurrentIcon = () => {
    if (mode === 'auto') return Monitor;
    return mode === 'dark' ? Moon : Sun;
  };

  const CurrentIcon = getCurrentIcon();
  const modeLabel = mode === 'auto' ? `Auto (${resolvedTheme})` : mode.charAt(0).toUpperCase() + mode.slice(1);

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg hover:bg-muted mx-auto"
            aria-label="Toggle theme"
          >
            <CurrentIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="min-w-[140px]">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                mode === value && 'bg-accent'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center justify-between px-2 py-1.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CurrentIcon className="h-4 w-4" />
        <span>Theme</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
          >
            {modeLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                mode === value && 'bg-accent'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ThemeToggle;
