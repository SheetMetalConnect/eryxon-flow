import React from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Switch,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Autocomplete,
  TextFieldProps,
  SelectProps,
  Box,
  Chip,
} from '@mui/material';
import { DatePicker, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Text Input with validation state
export interface TextInputProps extends Omit<TextFieldProps, 'error' | 'helperText'> {
  error?: string;
  helperText?: string;
}

export const TextInput: React.FC<TextInputProps> = ({ error, helperText, ...props }) => {
  return (
    <TextField
      fullWidth
      variant="outlined"
      error={!!error}
      helperText={error || helperText}
      {...props}
    />
  );
};

// Select Input with validation
export interface SelectInputProps extends Omit<SelectProps, 'error'> {
  label: string;
  options: Array<{ value: string | number; label: string }>;
  error?: string;
  helperText?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  options,
  error,
  helperText,
  ...props
}) => {
  return (
    <FormControl fullWidth error={!!error} variant={props.variant || "outlined"}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} {...props}>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {(error || helperText) && <FormHelperText>{error || helperText}</FormHelperText>}
    </FormControl>
  );
};

// Switch Input
export interface SwitchInputProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  helperText?: string;
}

export const SwitchInput: React.FC<SwitchInputProps> = ({
  label,
  checked,
  onChange,
  disabled,
  helperText,
}) => {
  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        }
        label={label}
      />
      {helperText && (
        <FormHelperText sx={{ ml: 2 }}>{helperText}</FormHelperText>
      )}
    </Box>
  );
};

// Checkbox Input
export interface CheckboxInputProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
}

export const CheckboxInput: React.FC<CheckboxInputProps> = ({
  label,
  checked,
  onChange,
  disabled,
  error,
}) => {
  return (
    <FormControl error={!!error}>
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        }
        label={label}
      />
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};

// Radio Group Input
export interface RadioInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  row?: boolean;
  error?: string;
}

export const RadioInput: React.FC<RadioInputProps> = ({
  label,
  value,
  onChange,
  options,
  row = false,
  error,
}) => {
  return (
    <FormControl error={!!error}>
      <InputLabel shrink sx={{ position: 'relative', transform: 'none', mb: 1 }}>
        {label}
      </InputLabel>
      <RadioGroup row={row} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={option.label}
          />
        ))}
      </RadioGroup>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};

// Autocomplete Input
export interface AutocompleteInputProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  options: any[];
  getOptionLabel?: (option: any) => string;
  multiple?: boolean;
  error?: string;
  helperText?: string;
  loading?: boolean;
  freeSolo?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  options,
  getOptionLabel,
  multiple = false,
  error,
  helperText,
  loading = false,
  freeSolo = false,
}) => {
  return (
    <Autocomplete
      fullWidth
      multiple={multiple}
      freeSolo={freeSolo}
      options={options}
      value={value}
      onChange={(_event, newValue) => onChange(newValue)}
      getOptionLabel={getOptionLabel}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={!!error}
          helperText={error || helperText}
        />
      )}
      renderTags={
        multiple
          ? (value: any[], getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={getOptionLabel ? getOptionLabel(option) : option}
                  {...getTagProps({ index })}
                  size="small"
                />
              ))
          : undefined
      }
    />
  );
};

// Date Picker
export interface DateInputProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled,
  minDate,
  maxDate,
}) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DatePicker
        label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        slotProps={{
          textField: {
            fullWidth: true,
            error: !!error,
            helperText: error || helperText,
          },
        }}
      />
    </LocalizationProvider>
  );
};

// Time Picker
export interface TimeInputProps {
  label: string;
  value: Date | null;
  onChange: (time: Date | null) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

export const TimeInput: React.FC<TimeInputProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled,
}) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <TimePicker
        label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        slotProps={{
          textField: {
            fullWidth: true,
            error: !!error,
            helperText: error || helperText,
          },
        }}
      />
    </LocalizationProvider>
  );
};

// DateTime Picker
export interface DateTimeInputProps {
  label: string;
  value: Date | null;
  onChange: (dateTime: Date | null) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled,
}) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DateTimePicker
        label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        slotProps={{
          textField: {
            fullWidth: true,
            error: !!error,
            helperText: error || helperText,
          },
        }}
      />
    </LocalizationProvider>
  );
};
