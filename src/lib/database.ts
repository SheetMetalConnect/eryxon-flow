import { supabase } from "@/integrations/supabase/client";

export interface TaskWithDetails {
  id: string;
  task_name: string;
  sequence: number;
  estimated_time: number;
  actual_time: number;
  status: "not_started" | "in_progress" | "completed" | "on_hold";
  completion_percentage: number;
  notes: string | null;
  assigned_operator_id: string | null;
  stage_id: string;
  part: {
    id: string;
    part_number: string;
    material: string;
    quantity: number;
    parent_part_id: string | null;
    job: {
      id: string;
      job_number: string;
      customer: string | null;
      due_date: string | null;
      due_date_override: string | null;
    };
  };
  stage: {
    id: string;
    name: string;
    color: string | null;
    sequence: number;
  };
  active_time_entry?: {
    id: string;
    operator_id: string;
    start_time: string;
    operator: {
      full_name: string;
    };
  };
}

export async function fetchTasksWithDetails(tenantId: string): Promise<TaskWithDetails[]> {
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select(`
      *,
      part:parts!inner(
        id,
        part_number,
        material,
        quantity,
        parent_part_id,
        job:jobs!inner(
          id,
          job_number,
          customer,
          due_date,
          due_date_override
        )
      ),
      stage:stages!inner(
        id,
        name,
        color,
        sequence
      )
    `)
    .eq("tenant_id", tenantId)
    .order("sequence");

  if (tasksError) throw tasksError;

  // Fetch active time entries
  const { data: activeEntries, error: entriesError } = await supabase
    .from("time_entries")
    .select(`
      id,
      task_id,
      operator_id,
      start_time,
      operator:profiles!inner(full_name)
    `)
    .eq("tenant_id", tenantId)
    .is("end_time", null);

  if (entriesError) throw entriesError;

  // Map active entries to tasks
  return tasks.map((task) => ({
    ...task,
    active_time_entry: activeEntries?.find((entry) => entry.task_id === task.id),
  }));
}

export async function startTimeTracking(
  taskId: string,
  operatorId: string,
  tenantId: string
) {
  // Get task details including stage_id
  const { data: task } = await supabase
    .from("tasks")
    .select("status, part_id, stage_id")
    .eq("id", taskId)
    .single();

  if (!task) throw new Error("Task not found");

  // Create time entry
  const { error: timeError } = await supabase.from("time_entries").insert({
    task_id: taskId,
    operator_id: operatorId,
    tenant_id: tenantId,
    start_time: new Date().toISOString(),
  });

  if (timeError) throw timeError;

  // Update task status if not started
  if (task.status === "not_started") {
    await supabase
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", taskId);
  }

  // Get part details
  const { data: part } = await supabase
    .from("parts")
    .select("status, job_id, current_stage_id")
    .eq("id", task.part_id)
    .single();

  if (!part) return;

  // Update part status and current_stage_id if not started
  if (part.status === "not_started") {
    await supabase
      .from("parts")
      .update({ 
        status: "in_progress",
        current_stage_id: task.stage_id 
      })
      .eq("id", task.part_id);
  } else if (part.current_stage_id !== task.stage_id) {
    // Update current_stage_id if working on a different stage
    await supabase
      .from("parts")
      .update({ current_stage_id: task.stage_id })
      .eq("id", task.part_id);
  }

  // Calculate job's current stage from all in_progress tasks
  const { data: jobTasks } = await supabase
    .from("tasks")
    .select("stage_id, stages!inner(sequence)")
    .eq("part_id", task.part_id)
    .eq("status", "in_progress");

  if (jobTasks && jobTasks.length > 0) {
    // Get the earliest stage (lowest sequence) that has in_progress tasks
    const earliestStage = jobTasks.reduce((earliest, t: any) => {
      return t.stages.sequence < earliest.sequence 
        ? { stage_id: t.stage_id, sequence: t.stages.sequence }
        : earliest;
    }, { stage_id: jobTasks[0].stage_id, sequence: jobTasks[0].stages.sequence });

    // Update job status and current_stage_id
    const { data: job } = await supabase
      .from("jobs")
      .select("status, current_stage_id")
      .eq("id", part.job_id)
      .single();

    if (job) {
      const updates: any = {};
      
      if (job.status === "not_started") {
        updates.status = "in_progress";
      }
      
      if (job.current_stage_id !== earliestStage.stage_id) {
        updates.current_stage_id = earliestStage.stage_id;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("jobs")
          .update(updates)
          .eq("id", part.job_id);
      }
    }
  }
}

export async function stopTimeTracking(taskId: string, operatorId: string) {
  // Find active time entry
  const { data: entry } = await supabase
    .from("time_entries")
    .select("id, start_time")
    .eq("task_id", taskId)
    .eq("operator_id", operatorId)
    .is("end_time", null)
    .single();

  if (!entry) throw new Error("No active time entry found");

  const endTime = new Date();
  const startTime = new Date(entry.start_time);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000); // minutes

  // Update time entry
  await supabase
    .from("time_entries")
    .update({
      end_time: endTime.toISOString(),
      duration,
    })
    .eq("id", entry.id);

  // Update task actual time
  const { data: task } = await supabase
    .from("tasks")
    .select("actual_time")
    .eq("id", taskId)
    .single();

  if (task) {
    await supabase
      .from("tasks")
      .update({ actual_time: (task.actual_time || 0) + duration })
      .eq("id", taskId);
  }
}

export async function completeTask(taskId: string, tenantId: string) {
  // Check for active time entries
  const { data: activeEntry } = await supabase
    .from("time_entries")
    .select("id")
    .eq("task_id", taskId)
    .is("end_time", null)
    .maybeSingle();

  if (activeEntry) {
    throw new Error("Please stop time tracking before completing the task");
  }

  // Get task details
  const { data: task } = await supabase
    .from("tasks")
    .select("part_id")
    .eq("id", taskId)
    .single();

  if (!task) throw new Error("Task not found");

  // Update task
  await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completion_percentage: 100,
    })
    .eq("id", taskId);

  // Check if all tasks in part are completed
  const { data: partTasks } = await supabase
    .from("tasks")
    .select("status, stage_id, stages!inner(sequence)")
    .eq("part_id", task.part_id);

  const allCompleted = partTasks?.every((t) => t.status === "completed");
  const inProgressTasks = partTasks?.filter((t) => t.status === "in_progress");

  if (allCompleted) {
    // All tasks complete - mark part as completed
    const { data: part } = await supabase
      .from("parts")
      .select("job_id")
      .eq("id", task.part_id)
      .single();

    await supabase
      .from("parts")
      .update({ 
        status: "completed",
        current_stage_id: null  // Clear current stage when complete
      })
      .eq("id", task.part_id);

    // Check if all parts in job are completed
    if (part) {
      const { data: jobParts } = await supabase
        .from("parts")
        .select("status")
        .eq("job_id", part.job_id);

      const allPartsCompleted = jobParts?.every((p) => p.status === "completed");

      if (allPartsCompleted) {
        await supabase
          .from("jobs")
          .update({ 
            status: "completed",
            current_stage_id: null  // Clear current stage when complete
          })
          .eq("id", part.job_id);
      } else {
        // Recalculate job's current_stage_id from remaining in_progress parts
        await recalculateJobCurrentStage(part.job_id);
      }
    }
  } else if (inProgressTasks && inProgressTasks.length > 0) {
    // Recalculate part's current_stage_id from remaining in_progress tasks
    const earliestStage = inProgressTasks.reduce((earliest: any, t: any) => {
      return t.stages.sequence < earliest.sequence 
        ? { stage_id: t.stage_id, sequence: t.stages.sequence }
        : earliest;
    }, { stage_id: inProgressTasks[0].stage_id, sequence: (inProgressTasks[0] as any).stages.sequence });

    await supabase
      .from("parts")
      .update({ current_stage_id: earliestStage.stage_id })
      .eq("id", task.part_id);

    // Also recalculate job's current_stage_id
    const { data: part } = await supabase
      .from("parts")
      .select("job_id")
      .eq("id", task.part_id)
      .single();

    if (part) {
      await recalculateJobCurrentStage(part.job_id);
    }
  }
}

async function recalculateJobCurrentStage(jobId: string) {
  // Get all in_progress tasks across all parts in this job
  const { data: jobParts } = await supabase
    .from("parts")
    .select("id")
    .eq("job_id", jobId);

  if (!jobParts || jobParts.length === 0) return;

  const partIds = jobParts.map(p => p.id);

  const { data: inProgressTasks } = await supabase
    .from("tasks")
    .select("stage_id, stages!inner(sequence)")
    .in("part_id", partIds)
    .eq("status", "in_progress");

  if (inProgressTasks && inProgressTasks.length > 0) {
    // Get the earliest stage (lowest sequence) with in_progress tasks
    const earliestStage = inProgressTasks.reduce((earliest: any, t: any) => {
      return t.stages.sequence < earliest.sequence 
        ? { stage_id: t.stage_id, sequence: t.stages.sequence }
        : earliest;
    }, { stage_id: inProgressTasks[0].stage_id, sequence: (inProgressTasks[0] as any).stages.sequence });

    await supabase
      .from("jobs")
      .update({ current_stage_id: earliestStage.stage_id })
      .eq("id", jobId);
  } else {
    // No in_progress tasks, but job isn't complete yet
    await supabase
      .from("jobs")
      .update({ current_stage_id: null })
      .eq("id", jobId);
  }
}
