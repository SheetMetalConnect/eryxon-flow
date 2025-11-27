"use client";

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePickerField } from '@/components/ui/date-picker';
import { TimePickerField } from '@/components/ui/time-picker';
import { DateTimePickerField } from '@/components/ui/datetime-picker';
import { Chip, ChipGroup } from '@/components/ui/chip';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, X } from 'lucide-react';

// Field wrapper for consistent styling
interface FieldWrapperProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

function FieldWrapper({
  label,
  error,
  helperText,
  required,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label className={cn(error && 'text-destructive')}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {children}
      {(error || helperText) && (
        <p
          className={cn(
            'text-sm',
            error ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}

// Text Input
export interface TextInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  onChange?: (value: string) => void;
}

export function TextInput({
  label,
  error,
  helperText,
  required,
  className,
  onChange,
  ...props
}: TextInputProps) {
  return (
    <FieldWrapper
      label={label}
      error={error}
      helperText={helperText}
      required={required}
    >
      <Input
        className={cn(error && 'border-destructive', className)}
        onChange={(e) => onChange?.(e.target.value)}
        {...props}
      />
    </FieldWrapper>
  );
}

// Textarea Input
export interface TextareaInputProps
  extends Omit<React.ComponentProps<typeof Textarea>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  onChange?: (value: string) => void;
}

export function TextareaInput({
  label,
  error,
  helperText,
  required,
  className,
  onChange,
  ...props
}: TextareaInputProps) {
  return (
    <FieldWrapper
      label={label}
      error={error}
      helperText={helperText}
      required={required}
    >
      <Textarea
        className={cn(error && 'border-destructive', className)}
        onChange={(e) => onChange?.(e.target.value)}
        {...props}
      />
    </FieldWrapper>
  );
}

// Select Input
export interface SelectInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function SelectInput({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  error,
  helperText,
  disabled,
  required,
  className,
}: SelectInputProps) {
  return (
    <FieldWrapper
      label={label}
      error={error}
      helperText={helperText}
      required={required}
    >
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn(error && 'border-destructive', className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  );
}

// Switch Input
export interface SwitchInputProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  helperText?: string;
  className?: string;
}

export function SwitchInput({
  label,
  checked,
  onChange,
  disabled,
  helperText,
  className,
}: SwitchInputProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-3">
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
        />
        <Label className="cursor-pointer" onClick={() => !disabled && onChange(!checked)}>
          {label}
        </Label>
      </div>
      {helperText && (
        <p className="text-sm text-muted-foreground ml-11">{helperText}</p>
      )}
    </div>
  );
}

// Checkbox Input
export interface CheckboxInputProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function CheckboxInput({
  label,
  checked,
  onChange,
  disabled,
  error,
  className,
}: CheckboxInputProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
        />
        <Label
          className={cn('cursor-pointer', error && 'text-destructive')}
          onClick={() => !disabled && onChange(!checked)}
        >
          {label}
        </Label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Radio Group Input
export interface RadioInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  orientation?: 'horizontal' | 'vertical';
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioInput({
  label,
  value,
  onChange,
  options,
  orientation = 'vertical',
  error,
  disabled,
  className,
}: RadioInputProps) {
  return (
    <FieldWrapper label={label} error={error}>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className={cn(
          orientation === 'horizontal' && 'flex flex-row gap-4',
          className
        )}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem value={option.value} id={option.value} />
            <Label htmlFor={option.value} className="cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </FieldWrapper>
  );
}

// Autocomplete Input (Combobox)
export interface AutocompleteInputProps<T> {
  label?: string;
  value: T | T[] | null;
  onChange: (value: T | T[] | null) => void;
  options: T[];
  getOptionLabel?: (option: T) => string;
  getOptionValue?: (option: T) => string;
  multiple?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  freeSolo?: boolean;
  className?: string;
}

export function AutocompleteInput<T>({
  label,
  value,
  onChange,
  options,
  getOptionLabel = (option: T) => String(option),
  getOptionValue = (option: T) => String(option),
  multiple = false,
  error,
  helperText,
  placeholder = 'Search...',
  loading = false,
  disabled = false,
  className,
}: AutocompleteInputProps<T>) {
  const [open, setOpen] = React.useState(false);

  const selectedValues = React.useMemo(() => {
    if (multiple) {
      return (value as T[] | null) || [];
    }
    return value ? [value as T] : [];
  }, [value, multiple]);

  const handleSelect = (option: T) => {
    if (multiple) {
      const currentValues = selectedValues;
      const optionValue = getOptionValue(option);
      const isSelected = currentValues.some(
        (v) => getOptionValue(v) === optionValue
      );

      if (isSelected) {
        onChange(
          currentValues.filter((v) => getOptionValue(v) !== optionValue) as T[]
        );
      } else {
        onChange([...currentValues, option] as T[]);
      }
    } else {
      onChange(option);
      setOpen(false);
    }
  };

  const handleRemove = (option: T) => {
    if (multiple) {
      const optionValue = getOptionValue(option);
      onChange(
        selectedValues.filter((v) => getOptionValue(v) !== optionValue) as T[]
      );
    }
  };

  return (
    <FieldWrapper label={label} error={error} helperText={helperText}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !selectedValues.length && 'text-muted-foreground',
              error && 'border-destructive',
              className
            )}
          >
            {multiple ? (
              selectedValues.length > 0 ? (
                <ChipGroup className="flex-wrap gap-1">
                  {selectedValues.slice(0, 3).map((v) => (
                    <Chip
                      key={getOptionValue(v)}
                      size="sm"
                      onRemove={() => handleRemove(v)}
                    >
                      {getOptionLabel(v)}
                    </Chip>
                  ))}
                  {selectedValues.length > 3 && (
                    <Chip size="sm" variant="secondary">
                      +{selectedValues.length - 3}
                    </Chip>
                  )}
                </ChipGroup>
              ) : (
                placeholder
              )
            ) : selectedValues.length > 0 ? (
              getOptionLabel(selectedValues[0])
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner />
                </div>
              ) : (
                <>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => {
                      const optionValue = getOptionValue(option);
                      const isSelected = selectedValues.some(
                        (v) => getOptionValue(v) === optionValue
                      );
                      return (
                        <CommandItem
                          key={optionValue}
                          value={optionValue}
                          onSelect={() => handleSelect(option)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              isSelected ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {getOptionLabel(option)}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FieldWrapper>
  );
}

// Re-export Date/Time pickers with consistent naming
export interface DateInputProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function DateInput({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled,
  minDate,
  maxDate,
  className,
}: DateInputProps) {
  return (
    <DatePickerField
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      helperText={helperText}
      disabled={disabled}
      minDate={minDate}
      maxDate={maxDate}
      className={className}
    />
  );
}

export interface TimeInputProps {
  label?: string;
  value: Date | null;
  onChange: (time: Date | null) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export function TimeInput({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled,
  className,
}: TimeInputProps) {
  return (
    <TimePickerField
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      helperText={helperText}
      disabled={disabled}
      className={className}
    />
  );
}

export interface DateTimeInputProps {
  label?: string;
  value: Date | null;
  onChange: (dateTime: Date | null) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export function DateTimeInput({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled,
  className,
}: DateTimeInputProps) {
  return (
    <DateTimePickerField
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      helperText={helperText}
      disabled={disabled}
      className={className}
    />
  );
}
