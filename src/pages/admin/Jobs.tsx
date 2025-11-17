import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Calendar, Plus, Clock, AlertCircle } from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import JobDetailModal from "@/components/admin/JobDetailModal";
import DueDateOverrideModal from "@/components/admin/DueDateOverrideModal";
import Layout from "@/components/Layout";

export default function Jobs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"due_date" | "status">("due_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [overrideJobId, setOverrideJobId] = useState<string | null>(null);

  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ["admin-jobs", statusFilter, searchQuery, sortBy, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select(`
          *,
          parts(id, operations(id))
        `);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      if (searchQuery) {
        query = query.or(`job_number.ilike.%${searchQuery}%,customer.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate counts and sort
      const processedJobs = data.map((job: any) => ({
        ...job,
        parts_count: job.parts?.length || 0,
        operations_count: job.parts?.reduce((sum: number, part: any) => sum + (part.operations?.length || 0), 0) || 0,
      }));

      // Sort
      processedJobs.sort((a, b) => {
        if (sortBy === "due_date") {
          const dateA = new Date(a.due_date_override || a.due_date);
          const dateB = new Date(b.due_date_override || b.due_date);
          return sortOrder === "asc"
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        } else {
          const statusOrder = { not_started: 0, in_progress: 1, on_hold: 2, completed: 3 };
          const orderA = statusOrder[a.status as keyof typeof statusOrder];
          const orderB = statusOrder[b.status as keyof typeof statusOrder];
          return sortOrder === "asc" ? orderA - orderB : orderB - orderA;
        }
      });

      return processedJobs;
    },
  });

  const handleSetOnHold = async (jobId: string) => {
    await supabase
      .from("jobs")
      .update({ status: "on_hold" })
      .eq("id", jobId);
    refetch();
  };

  const handleResume = async (jobId: string) => {
    await supabase
      .from("jobs")
      .update({ status: "in_progress" })
      .eq("id", jobId);
    refetch();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      not_started: "secondary",
      in_progress: "default",
      completed: "outline",
      on_hold: "destructive",
    };
    const statusLabels: Record<string, string> = {
      not_started: t("operations.status.notStarted"),
      in_progress: t("operations.status.inProgress"),
      completed: t("operations.status.completed"),
      on_hold: t("operations.status.onHold"),
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const getDueDateStyle = (job: any) => {
    const dueDate = new Date(job.due_date_override || job.due_date);
    const today = new Date();
    const weekFromNow = addDays(today, 7);

    if (isBefore(dueDate, today)) {
      return "text-red-600 font-semibold";
    } else if (isBefore(dueDate, weekFromNow)) {
      return "text-yellow-600 font-semibold";
    }
    return "";
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("jobs.title")}</h1>
        <Button onClick={() => navigate("/admin/jobs/new")}>
          <Plus className="mr-2 h-4 w-4" /> {t("jobs.createJob")}
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Input
          placeholder={t("jobs.searchJobs")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t("jobs.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("workQueue.allStatuses")}</SelectItem>
            <SelectItem value="not_started">{t("operations.status.notStarted")}</SelectItem>
            <SelectItem value="in_progress">{t("operations.status.inProgress")}</SelectItem>
            <SelectItem value="completed">{t("operations.status.completed")}</SelectItem>
            <SelectItem value="on_hold">{t("operations.status.onHold")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder={t("workQueue.sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due_date">{t("jobs.dueDate")}</SelectItem>
            <SelectItem value="status">{t("jobs.status")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder={t("workQueue.sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">{t("workQueue.sortBy")} ↑</SelectItem>
            <SelectItem value="desc">{t("workQueue.sortBy")} ↓</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs Table */}
      {isLoading ? (
        <div className="text-center py-8">{t("common.loading")}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("jobs.jobNumber")}</TableHead>
              <TableHead>{t("jobs.customer")}</TableHead>
              <TableHead>{t("jobs.dueDate")}</TableHead>
              <TableHead>{t("jobs.status")}</TableHead>
              <TableHead className="text-right">{t("jobs.parts")}</TableHead>
              <TableHead className="text-right">{t("jobs.operations")}</TableHead>
              <TableHead className="text-right">{t("common.edit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs?.map((job: any) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.job_number}</TableCell>
                <TableCell>{job.customer}</TableCell>
                <TableCell className={getDueDateStyle(job)}>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(job.due_date_override || job.due_date), "MMM dd, yyyy")}
                    {job.due_date_override && (
                      <Badge variant="outline" className="text-xs">
                        {t("jobs.dueDate")}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(job.status)}</TableCell>
                <TableCell className="text-right">{job.parts_count}</TableCell>
                <TableCell className="text-right">{job.operations_count}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      {t("jobs.viewDetails")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOverrideJobId(job.id)}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    {job.status === "on_hold" ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleResume(job.id)}
                      >
                        {t("operations.startOperation")}
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleSetOnHold(job.id)}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {selectedJobId && (
        <JobDetailModal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onUpdate={() => refetch()}
        />
      )}

      {overrideJobId && (
        <DueDateOverrideModal
          jobId={overrideJobId}
          onClose={() => setOverrideJobId(null)}
          onUpdate={() => refetch()}
        />
      )}
    </Layout>
  );
}
