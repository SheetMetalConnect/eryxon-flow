import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Play, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TimeTypeSelectorProps {
  value: string;
  onChange: (timeType: string) => void;
  disabled?: boolean;
}

const timeTypes = [
  { value: 'setup', icon: Wrench, color: 'text-orange-500' },
  { value: 'run', icon: Play, color: 'text-green-500' },
  { value: 'rework', icon: RefreshCw, color: 'text-yellow-500' },
  { value: 'wait', icon: Clock, color: 'text-gray-500' },
  { value: 'breakdown', icon: AlertTriangle, color: 'text-red-500' }
];

export default function TimeTypeSelector({ value, onChange, disabled }: TimeTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder={t('time.types.selectType')} />
      </SelectTrigger>
      <SelectContent>
        {timeTypes.map(({ value, icon: Icon, color }) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span>{t(`time.types.${value}`)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
