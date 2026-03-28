import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Cell {
  id: string;
  name: string;
  color: string | null;
}

interface OperatorViewHeaderProps {
  cells: Cell[];
  selectedCellId: string;
  onCellChange: (value: string) => void;
  jobCount: number;
}

export function OperatorViewHeader({
  cells,
  selectedCellId,
  onCellChange,
  jobCount,
}: OperatorViewHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <span className="font-medium text-muted-foreground">
          {t("navigation.terminalView", "Terminal View")}:
        </span>
        <Select value={selectedCellId} onValueChange={onCellChange}>
          <SelectTrigger className="w-[200px] border-input bg-card text-foreground">
            <SelectValue
              placeholder={t("terminal.selectCell", "Select Cell")}
            />
          </SelectTrigger>
          <SelectContent className="border-border bg-card text-foreground">
            <SelectItem value="all">
              {t("terminal.allCells", "All Cells")}
            </SelectItem>
            {cells.map((cell) => (
              <SelectItem key={cell.id} value={cell.id}>
                {cell.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-xs text-muted-foreground">
        {jobCount} {t("terminal.jobsFound")}
      </div>
    </div>
  );
}
