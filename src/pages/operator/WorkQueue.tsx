import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchTasksWithDetails, TaskWithDetails } from "@/lib/database";
import Layout from "@/components/Layout";
import TaskCard from "@/components/operator/TaskCard";
import CurrentlyTimingWidget from "@/components/operator/CurrentlyTimingWidget";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function WorkQueue() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [stages, setStages] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.tenant_id) return;

    loadData();
    setupRealtimeSubscriptions();
  }, [profile?.tenant_id]);

  const loadData = async () => {
    if (!profile?.tenant_id) return;

    try {
      const [tasksData, stagesData] = await Promise.all([
        fetchTasksWithDetails(profile.tenant_id),
        supabase
          .from("stages")
          .select("*")
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true)
          .order("sequence"),
      ]);

      setTasks(tasksData);
      if (stagesData.data) setStages(stagesData.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load work queue");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!profile?.tenant_id) return;

    const tasksChannel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    const timeEntriesChannel = supabase
      .channel("time-entries-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(timeEntriesChannel);
    };
  };

  // Get unique materials
  const materials = Array.from(
    new Set(tasks.map((task) => task.part.material))
  ).sort();

  // Filter tasks by material
  const filteredTasks =
    selectedMaterial === "all"
      ? tasks
      : tasks.filter((task) => task.part.material === selectedMaterial);

  // Group tasks by stage
  const tasksByStage = stages.map((stage) => ({
    stage,
    tasks: filteredTasks.filter((task) => task.stage_id === stage.id),
  }));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Currently Timing Widget */}
        <CurrentlyTimingWidget />

        {/* Material Filter */}
        <div className="bg-card rounded-lg border p-4">
          <Tabs value={selectedMaterial} onValueChange={setSelectedMaterial}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">All Materials</TabsTrigger>
              {materials.map((material) => (
                <TabsTrigger key={material} value={material}>
                  {material}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Kanban Board */}
        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
            {tasksByStage.map(({ stage, tasks }) => (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80 bg-card rounded-lg border"
              >
                <div
                  className="p-4 border-b"
                  style={{
                    borderTopColor: stage.color || "hsl(var(--stage-default))",
                    borderTopWidth: "4px",
                  }}
                >
                  <h3 className="font-semibold text-lg">{stage.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="p-4 space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
                  {tasks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No tasks
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <TaskCard key={task.id} task={task} onUpdate={loadData} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
