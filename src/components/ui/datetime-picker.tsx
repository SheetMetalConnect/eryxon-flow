"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Separator } from "@/components/ui/separator";

export interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  use24Hour?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  label,
  placeholder = "Pick date and time",
  disabled = false,
  error,
  helperText,
  minDate,
  maxDate,
  className,
  use24Hour = true,
}: DateTimePickerProps) {
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

  const formatDateTime = (date: Date) => {
    const dateStr = format(date, "PPP");
    const hours = date.getHours();
    const mins = date.getMinutes();
    if (use24Hour) {
      return `${dateStr} ${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    }
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${dateStr} ${String(displayHour).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      return;
    }
    // Preserve existing time if value exists
    const newDate = new Date(date);
    if (value) {
      newDate.setHours(value.getHours());
      newDate.setMinutes(value.getMinutes());
      newDate.setSeconds(value.getSeconds());
    } else {
      newDate.setHours(0);
      newDate.setMinutes(0);
      newDate.setSeconds(0);
    }
    onChange(newDate);
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
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? formatDateTime(value) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleDateSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
          />
          <Separator />
          <div className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Time</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Select
                value={value ? String(value.getHours()) : undefined}
                onValueChange={handleHourChange}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {hours.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xl">:</span>
              <Select
                value={value ? String(value.getMinutes()) : undefined}
                onValueChange={handleMinuteChange}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="MM" />
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
          <Separator />
          <div className="p-3 flex justify-end">
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
export interface DateTimePickerFieldProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  use24Hour?: boolean;
}

export function DateTimePickerField({
  value,
  onChange,
  ...props
}: DateTimePickerFieldProps) {
  return (
    <DateTimePicker
      value={value ?? undefined}
      onChange={(date) => onChange(date ?? null)}
      {...props}
    />
  );
}
