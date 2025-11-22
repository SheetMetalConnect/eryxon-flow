import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Play, RefreshCw, Clock, AlertTriangle } from "lucide-react";

interface TimeTypeSelectorProps {
  value: string;
  onChange: (timeType: string) => void;
  disabled?: boolean;
}

const timeTypes = [
  { value: 'setup', label: 'Setup', icon: Wrench, color: 'text-orange-500' },
  { value: 'run', label: 'Run', icon: Play, color: 'text-green-500' },
  { value: 'rework', label: 'Rework', icon: RefreshCw, color: 'text-yellow-500' },
  { value: 'wait', label: 'Wait', icon: Clock, color: 'text-gray-500' },
  { value: 'breakdown', label: 'Breakdown', icon: AlertTriangle, color: 'text-red-500' }
];

export default function TimeTypeSelector({ value, onChange, disabled }: TimeTypeSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent>
        {timeTypes.map(({ value, label, icon: Icon, color }) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span>{label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
