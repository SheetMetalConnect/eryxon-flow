"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface TimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  use24Hour?: boolean;
}

export function TimePicker({
  value,
  onChange,
  label,
  placeholder = "Pick a time",
  disabled = false,
  error,
  helperText,
  className,
  use24Hour = true,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const hours = React.useMemo(() => {
    return Array.from({ length: use24Hour ? 24 : 12 }, (_, i) => {
      const hour = use24Hour ? i : i === 0 ? 12 : i;
      return {
        value: String(use24Hour ? i : i === 0 ? 0 : i),
        label: String(hour).padStart(2, "0"),
      };
    });
  }, [use24Hour]);

  const minutes = React.useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      value: String(i),
      label: String(i).padStart(2, "0"),
    }));
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (use24Hour) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
  };

  const handleHourChange = (hourStr: string) => {
    const hour = parseInt(hourStr, 10);
    const newDate = value ? new Date(value) : new Date();
    newDate.setHours(hour);
    if (!value) {
      newDate.setMinutes(0);
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
    }
    onChange(newDate);
  };

  const handleMinuteChange = (minuteStr: string) => {
    const minute = parseInt(minuteStr, 10);
    const newDate = value ? new Date(value) : new Date();
    if (!value) {
      newDate.setHours(0);
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
    }
    newDate.setMinutes(minute);
    onChange(newDate);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label className={cn(error && "text-destructive")}>{label}</Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive focus:ring-destructive"
            )}
          >
            <Clock className="mr-2 h-4 w-4" />
            {value ? formatTime(value) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Hour</Label>
              <Select
                value={value ? String(value.getHours()) : undefined}
                onValueChange={handleHourChange}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="--" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {hours.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-xl mt-5">:</span>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Minute</Label>
              <Select
                value={value ? String(value.getMinutes()) : undefined}
                onValueChange={handleMinuteChange}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="--" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {minutes.map((minute) => (
                    <SelectItem key={minute.value} value={minute.value}>
                      {minute.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {(error || helperText) && (
        <p
          className={cn(
            "text-sm",
            error ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}

// Controlled version for form integration
export interface TimePickerFieldProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  use24Hour?: boolean;
}

export function TimePickerField({
  value,
  onChange,
  ...props
}: TimePickerFieldProps) {
  return (
    <TimePicker
      value={value ?? undefined}
      onChange={(date) => onChange(date ?? null)}
      {...props}
    />
  );
}
