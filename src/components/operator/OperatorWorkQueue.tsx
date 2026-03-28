import { useTranslation } from "react-i18next";
import { JobRow } from "@/components/terminal/JobRow";
import { TerminalJob } from "@/types/terminal";

interface JobSectionProps {
  title: string;
  jobs: TerminalJob[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  emptyMessage: string;
  variant: "process" | "buffer" | "expected";
  tableHead: React.ReactNode;
  sectionClassName: string;
  headerClassName: string;
  titleClassName: string;
}

function JobSection({
  title,
  jobs,
  selectedJobId,
  onSelectJob,
  emptyMessage,
  variant,
  tableHead,
  sectionClassName,
  headerClassName,
  titleClassName,
}: JobSectionProps) {
  return (
    <div className={sectionClassName}>
      <div className={headerClassName}>
        <h2 className={titleClassName}>
          {title} ({jobs.length})
        </h2>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          {tableHead}
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-8 text-center italic text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isSelected={selectedJobId === job.id}
                  onClick={() => onSelectJob(job.id)}
                  variant={variant}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface OperatorWorkQueueProps {
  inProcessJobs: TerminalJob[];
  inBufferJobs: TerminalJob[];
  expectedJobs: TerminalJob[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
}

export function OperatorWorkQueue({
  inProcessJobs,
  inBufferJobs,
  expectedJobs,
  selectedJobId,
  onSelectJob,
}: OperatorWorkQueueProps) {
  const { t } = useTranslation();

  const tableHead = (
    <thead className="sticky top-0 z-10 bg-muted/50">
      <tr className="border-b border-border">
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.jobNumber")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.partNumber")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.operation")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.cell")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.material")}
        </th>
        <th className="px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.quantity")}
        </th>
        <th className="px-2 py-1.5 text-right text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.hours")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.plannedStart", "Start")}
        </th>
        <th className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.dueDate")}
        </th>
        <th className="px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground">
          {t("terminal.columns.files")}
        </th>
      </tr>
    </thead>
  );

  return (
    <>
      <JobSection
        title={t("terminal.inProcess")}
        jobs={inProcessJobs}
        selectedJobId={selectedJobId}
        onSelectJob={onSelectJob}
        emptyMessage={t("terminal.noActiveJobs")}
        variant="process"
        tableHead={tableHead}
        sectionClassName="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-gradient-to-b from-status-active/5 to-transparent"
        headerClassName="flex shrink-0 items-center justify-between border-l-2 border-status-active bg-status-active/10 px-3 py-1.5 backdrop-blur-sm"
        titleClassName="text-sm font-semibold text-status-active"
      />
      <JobSection
        title={t("terminal.inBuffer")}
        jobs={inBufferJobs}
        selectedJobId={selectedJobId}
        onSelectJob={onSelectJob}
        emptyMessage={t("terminal.noBufferJobs", "No jobs in buffer")}
        variant="buffer"
        tableHead={tableHead}
        sectionClassName="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-gradient-to-b from-info/5 to-transparent"
        headerClassName="flex shrink-0 items-center justify-between border-l-2 border-alert-info-border bg-alert-info-bg/80 px-3 py-1.5 backdrop-blur-sm"
        titleClassName="text-sm font-semibold text-info"
      />
      <JobSection
        title={t("terminal.expected")}
        jobs={expectedJobs}
        selectedJobId={selectedJobId}
        onSelectJob={onSelectJob}
        emptyMessage={t("terminal.noExpectedJobs", "No expected jobs")}
        variant="expected"
        tableHead={tableHead}
        sectionClassName="flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-status-pending/5 to-transparent"
        headerClassName="flex shrink-0 items-center justify-between border-l-2 border-status-pending bg-status-pending/10 px-3 py-1.5 backdrop-blur-sm"
        titleClassName="text-sm font-semibold text-status-pending"
      />
    </>
  );
}
