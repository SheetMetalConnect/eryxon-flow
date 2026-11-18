import * as React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Check,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  Play,
  Pause,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Base button props with loading state
export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
}

// Primary Action Button
export const PrimaryButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, children, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn('cta-button', className)}
        {...props}
      >
        {loading && <Spinner size="sm" className="mr-2" />}
        {children}
      </Button>
    );
  }
);
PrimaryButton.displayName = 'PrimaryButton';

// Secondary Action Button
export const SecondaryButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, children, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="secondary"
        disabled={disabled || loading}
        className={className}
        {...props}
      >
        {loading && <Spinner size="sm" className="mr-2" />}
        {children}
      </Button>
    );
  }
);
SecondaryButton.displayName = 'SecondaryButton';

// Outlined Button
export const OutlinedButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <Button ref={ref} variant="outline" {...props}>
        {children}
      </Button>
    );
  }
);
OutlinedButton.displayName = 'OutlinedButton';

// Text Button
export const TextButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <Button ref={ref} variant="ghost" {...props}>
        {children}
      </Button>
    );
  }
);
TextButton.displayName = 'TextButton';

// Common Action Buttons
export const AddButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <PrimaryButton ref={ref} {...props}>
        <Plus className="h-4 w-4 mr-2" />
        {children || 'Add'}
      </PrimaryButton>
    );
  }
);
AddButton.displayName = 'AddButton';

export const EditButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <OutlinedButton ref={ref} {...props}>
        <Pencil className="h-4 w-4 mr-2" />
        {children || 'Edit'}
      </OutlinedButton>
    );
  }
);
EditButton.displayName = 'EditButton';

export const DeleteButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="outline"
        className={cn('text-destructive border-destructive hover:bg-destructive/10', className)}
        {...props}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {children || 'Delete'}
      </Button>
    );
  }
);
DeleteButton.displayName = 'DeleteButton';

export const SaveButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <PrimaryButton ref={ref} {...props}>
        <Save className="h-4 w-4 mr-2" />
        {children || 'Save'}
      </PrimaryButton>
    );
  }
);
SaveButton.displayName = 'SaveButton';

export const CancelButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <OutlinedButton ref={ref} {...props}>
        <X className="h-4 w-4 mr-2" />
        {children || 'Cancel'}
      </OutlinedButton>
    );
  }
);
CancelButton.displayName = 'CancelButton';

export const ConfirmButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <PrimaryButton ref={ref} {...props}>
        <Check className="h-4 w-4 mr-2" />
        {children || 'Confirm'}
      </PrimaryButton>
    );
  }
);
ConfirmButton.displayName = 'ConfirmButton';

export const RefreshButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <OutlinedButton ref={ref} {...props}>
        <RefreshCw className="h-4 w-4 mr-2" />
        {children || 'Refresh'}
      </OutlinedButton>
    );
  }
);
RefreshButton.displayName = 'RefreshButton';

export const DownloadButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <OutlinedButton ref={ref} {...props}>
        <Download className="h-4 w-4 mr-2" />
        {children || 'Download'}
      </OutlinedButton>
    );
  }
);
DownloadButton.displayName = 'DownloadButton';

export const UploadButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <OutlinedButton ref={ref} {...props}>
        <Upload className="h-4 w-4 mr-2" />
        {children || 'Upload'}
      </OutlinedButton>
    );
  }
);
UploadButton.displayName = 'UploadButton';

export const SearchButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <OutlinedButton ref={ref} {...props}>
        <Search className="h-4 w-4 mr-2" />
        {children || 'Search'}
      </OutlinedButton>
    );
  }
);
SearchButton.displayName = 'SearchButton';

export const FilterButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <OutlinedButton ref={ref} {...props}>
        <Filter className="h-4 w-4 mr-2" />
        {children || 'Filter'}
      </OutlinedButton>
    );
  }
);
FilterButton.displayName = 'FilterButton';

// Icon Action Buttons with Tooltips
export interface ActionIconButtonProps extends Omit<ButtonProps, 'size'> {
  tooltip: string;
  loading?: boolean;
}

export const ActionIconButton = React.forwardRef<HTMLButtonElement, ActionIconButtonProps>(
  ({ tooltip, loading = false, children, disabled, className, ...props }, ref) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              variant="ghost"
              size="icon"
              disabled={disabled || loading}
              className={cn('h-8 w-8', className)}
              {...props}
            >
              {loading ? <Spinner size="sm" /> : children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);
ActionIconButton.displayName = 'ActionIconButton';

// Specific Icon Buttons
export const EditIconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ActionIconButtonProps, 'tooltip' | 'children'>
>((props, ref) => {
  return (
    <ActionIconButton ref={ref} tooltip="Edit" {...props}>
      <Pencil className="h-4 w-4" />
    </ActionIconButton>
  );
});
EditIconButton.displayName = 'EditIconButton';

export const DeleteIconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ActionIconButtonProps, 'tooltip' | 'children'>
>((props, ref) => {
  return (
    <ActionIconButton
      ref={ref}
      tooltip="Delete"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      {...props}
    >
      <Trash2 className="h-4 w-4" />
    </ActionIconButton>
  );
});
DeleteIconButton.displayName = 'DeleteIconButton';

export const PlayIconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ActionIconButtonProps, 'tooltip' | 'children'>
>((props, ref) => {
  return (
    <ActionIconButton
      ref={ref}
      tooltip="Start"
      className="text-green-600 hover:text-green-600 hover:bg-green-600/10"
      {...props}
    >
      <Play className="h-4 w-4" />
    </ActionIconButton>
  );
});
PlayIconButton.displayName = 'PlayIconButton';

export const PauseIconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ActionIconButtonProps, 'tooltip' | 'children'>
>((props, ref) => {
  return (
    <ActionIconButton
      ref={ref}
      tooltip="Pause"
      className="text-yellow-600 hover:text-yellow-600 hover:bg-yellow-600/10"
      {...props}
    >
      <Pause className="h-4 w-4" />
    </ActionIconButton>
  );
});
PauseIconButton.displayName = 'PauseIconButton';

export const StopIconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ActionIconButtonProps, 'tooltip' | 'children'>
>((props, ref) => {
  return (
    <ActionIconButton
      ref={ref}
      tooltip="Stop"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      {...props}
    >
      <Square className="h-4 w-4" />
    </ActionIconButton>
  );
});
StopIconButton.displayName = 'StopIconButton';
