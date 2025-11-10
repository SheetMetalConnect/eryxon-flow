import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
          parts:parts(count),
          tasks:parts(tasks(count))
        `);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchQuery) {
        query = query.or(`job_number.ilike.%${searchQuery}%,customer.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate counts and sort
      const processedJobs = data.map((job: any) => ({
        ...job,
        parts_count: job.parts?.[0]?.count || 0,
        tasks_count: job.tasks?.reduce((sum: number, part: any) => sum + (part.tasks?.[0]?.count || 0), 0) || 0,
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
    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace("_", " ").toUpperCase()}
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
        <h1 className="text-3xl font-bold">Job Management</h1>
        <Button onClick={() => navigate("/admin/jobs/new")}>
          <Plus className="mr-2 h-4 w-4" /> Create Job
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Input
          placeholder="Search by job# or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due_date">Due Date</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs Table */}
      {isLoading ? (
        <div className="text-center py-8">Loading jobs...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Parts</TableHead>
              <TableHead className="text-right">Tasks</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                        Overridden
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(job.status)}</TableCell>
                <TableCell className="text-right">{job.parts_count}</TableCell>
                <TableCell className="text-right">{job.tasks_count}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      View Details
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
                        Resume
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
