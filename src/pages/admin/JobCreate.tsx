import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Edit2,
  Save,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";

type Part = {
  id: string;
  part_number: string;
  material: string;
  quantity: number;
  parent_part_id?: string;
  notes?: string;
  metadata?: Record<string, any>;
  tasks: Task[];
};

type Task = {
  id: string;
  task_name: string;
  stage_id: string;
  estimated_time?: number;
  sequence: number;
  notes?: string;
};

export default function JobCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Step 1: Job details
  const [jobNumber, setJobNumber] = useState("");
  const [customer, setCustomer] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [jobNotes, setJobNotes] = useState("");
  const [jobMetadata, setJobMetadata] = useState<Record<string, string>>({});

  // Step 2: Parts
  const [parts, setParts] = useState<Part[]>([]);
  const [editingPart, setEditingPart] = useState<Partial<Part> | null>(null);

  // Step 3: Tasks
  const [editingTask, setEditingTask] = useState<{
    partId: string;
    task: Partial<Task>;
  } | null>(null);

  // Fetch stages for task creation
  const { data: stages } = useQuery({
    queryKey: ["stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stages")
        .select("*")
        .eq("active", true)
        .order("sequence");

      if (error) throw error;
      return data;
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async () => {
      // Start transaction
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          job_number: jobNumber,
          customer,
          due_date: dueDate,
          notes: jobNotes,
          metadata: Object.keys(jobMetadata).length > 0 ? jobMetadata : null,
          status: "not_started",
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Insert parts
      const partsToInsert = parts.map((part) => ({
        job_id: job.id,
        part_number: part.part_number,
        material: part.material,
        quantity: part.quantity,
        parent_part_id: part.parent_part_id,
        notes: part.notes,
        metadata: part.metadata && Object.keys(part.metadata).length > 0 ? part.metadata : null,
        status: "not_started",
      }));

      const { data: insertedParts, error: partsError } = await supabase
        .from("parts")
        .insert(partsToInsert)
        .select();

      if (partsError) throw partsError;

      // Insert tasks for each part
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const insertedPart = insertedParts[i];

        if (part.tasks.length > 0) {
          const tasksToInsert = part.tasks.map((task) => ({
            part_id: insertedPart.id,
            task_name: task.task_name,
            stage_id: task.stage_id,
            estimated_time: task.estimated_time,
            sequence: task.sequence,
            notes: task.notes,
            status: "not_started",
          }));

          const { error: tasksError } = await supabase
            .from("tasks")
            .insert(tasksToInsert);

          if (tasksError) throw tasksError;
        }
      }

      return job;
    },
    onSuccess: (job) => {
      toast({
        title: "Job created successfully",
        description: `Job ${job.job_number} has been created with ${parts.length} parts.`,
      });
      navigate("/admin/jobs");
    },
    onError: (error: any) => {
      toast({
        title: "Error creating job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 1 && !jobNumber) {
      toast({
        title: "Validation error",
        description: "Job number is required",
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && parts.length === 0) {
      toast({
        title: "Validation error",
        description: "At least one part is required",
        variant: "destructive",
      });
      return;
    }
    if (step === 3) {
      const partsWithoutTasks = parts.filter((p) => p.tasks.length === 0);
      if (partsWithoutTasks.length > 0) {
        toast({
          title: "Validation error",
          description: "Each part must have at least one task",
          variant: "destructive",
        });
        return;
      }
    }
    setStep(step + 1);
  };

  const handleAddPart = () => {
    if (!editingPart?.part_number || !editingPart?.material) {
      toast({
        title: "Validation error",
        description: "Part number and material are required",
        variant: "destructive",
      });
      return;
    }

    const newPart: Part = {
      id: crypto.randomUUID(),
      part_number: editingPart.part_number,
      material: editingPart.material,
      quantity: editingPart.quantity || 1,
      parent_part_id: editingPart.parent_part_id,
      notes: editingPart.notes,
      metadata: editingPart.metadata,
      tasks: [],
    };

    setParts([...parts, newPart]);
    setEditingPart(null);
  };

  const handleAddTask = (partId: string) => {
    if (!editingTask?.task.task_name || !editingTask?.task.stage_id) {
      toast({
        title: "Validation error",
        description: "Task name and stage are required",
        variant: "destructive",
      });
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      task_name: editingTask.task.task_name,
      stage_id: editingTask.task.stage_id,
      estimated_time: editingTask.task.estimated_time,
      sequence: editingTask.task.sequence || 1,
      notes: editingTask.task.notes,
    };

    setParts(
      parts.map((part) =>
        part.id === partId
          ? { ...part, tasks: [...part.tasks, newTask] }
          : part
      )
    );
    setEditingTask(null);
  };

  const addMetadataField = () => {
    const key = prompt("Enter metadata key:");
    if (key) {
      setJobMetadata({ ...jobMetadata, [key]: "" });
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate("/admin/jobs")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
          </Button>
        </div>

      {/* Progress Indicator */}
      <div className="flex justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                s <= step ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              {s < step ? <Check className="h-5 w-5" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`w-20 h-1 mx-2 ${
                  s < step ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Job Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Job Number *</Label>
                <Input
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  placeholder="JOB-001"
                />
              </div>
              <div>
                <Label>Customer *</Label>
                <Input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={jobNotes}
                onChange={(e) => setJobNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Custom Metadata</Label>
                <Button size="sm" variant="outline" onClick={addMetadataField}>
                  <Plus className="h-4 w-4 mr-2" /> Add Field
                </Button>
              </div>
              {Object.entries(jobMetadata).map(([key, value]) => (
                <div key={key} className="flex gap-2 mb-2">
                  <Input value={key} disabled className="w-1/3" />
                  <Input
                    value={value}
                    onChange={(e) =>
                      setJobMetadata({ ...jobMetadata, [key]: e.target.value })
                    }
                    placeholder="Value"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      const newMetadata = { ...jobMetadata };
                      delete newMetadata[key];
                      setJobMetadata(newMetadata);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Parts */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Step 2: Add Parts</CardTitle>
              <Button onClick={() => setEditingPart({})}>
                <Plus className="h-4 w-4 mr-2" /> Add Part
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Part Form */}
            {editingPart && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold mb-3">New Part</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Part Number *</Label>
                    <Input
                      value={editingPart.part_number || ""}
                      onChange={(e) =>
                        setEditingPart({ ...editingPart, part_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Material *</Label>
                    <Input
                      value={editingPart.material || ""}
                      onChange={(e) =>
                        setEditingPart({ ...editingPart, material: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={editingPart.quantity || 1}
                      onChange={(e) =>
                        setEditingPart({
                          ...editingPart,
                          quantity: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Parent Part (Optional)</Label>
                    <Select
                      value={editingPart.parent_part_id}
                      onValueChange={(value) =>
                        setEditingPart({ ...editingPart, parent_part_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {parts.map((part) => (
                          <SelectItem key={part.id} value={part.id}>
                            {part.part_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={editingPart.notes || ""}
                      onChange={(e) =>
                        setEditingPart({ ...editingPart, notes: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleAddPart}>
                    <Save className="h-4 w-4 mr-2" /> Save Part
                  </Button>
                  <Button variant="outline" onClick={() => setEditingPart(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Parts List */}
            <div className="space-y-2">
              {parts.map((part) => (
                <div key={part.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{part.part_number}</h4>
                      <p className="text-sm text-gray-600">
                        Material: {part.material} | Qty: {part.quantity}
                      </p>
                      {part.parent_part_id && (
                        <Badge variant="outline" className="mt-1">
                          Assembly
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setParts(parts.filter((p) => p.id !== part.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Tasks */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Add Tasks to Parts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {parts.map((part) => (
              <div key={part.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">Part# {part.part_number}</h4>
                  <Button
                    size="sm"
                    onClick={() =>
                      setEditingTask({ partId: part.id, task: { sequence: part.tasks.length + 1 } })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Task
                  </Button>
                </div>

                {/* Task Form */}
                {editingTask?.partId === part.id && (
                  <div className="border rounded-lg p-3 bg-blue-50 mb-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Task Name *</Label>
                        <Input
                          value={editingTask.task.task_name || ""}
                          onChange={(e) =>
                            setEditingTask({
                              ...editingTask,
                              task: { ...editingTask.task, task_name: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Stage *</Label>
                        <Select
                          value={editingTask.task.stage_id}
                          onValueChange={(value) =>
                            setEditingTask({
                              ...editingTask,
                              task: { ...editingTask.task, stage_id: value },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {stages?.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Estimated Time (minutes)</Label>
                        <Input
                          type="number"
                          value={editingTask.task.estimated_time || ""}
                          onChange={(e) =>
                            setEditingTask({
                              ...editingTask,
                              task: {
                                ...editingTask.task,
                                estimated_time: parseInt(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Sequence</Label>
                        <Input
                          type="number"
                          value={editingTask.task.sequence || 1}
                          onChange={(e) =>
                            setEditingTask({
                              ...editingTask,
                              task: {
                                ...editingTask.task,
                                sequence: parseInt(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button onClick={() => handleAddTask(part.id)}>
                        <Save className="h-4 w-4 mr-2" /> Save Task
                      </Button>
                      <Button variant="outline" onClick={() => setEditingTask(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tasks List */}
                <div className="space-y-2">
                  {part.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex justify-between items-center bg-gray-50 p-2 rounded"
                    >
                      <div>
                        <span className="font-medium">{task.task_name}</span>
                        <span className="text-sm text-gray-600 ml-3">
                          Seq: {task.sequence}
                          {task.estimated_time && ` | Est: ${task.estimated_time}min`}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setParts(
                            parts.map((p) =>
                              p.id === part.id
                                ? {
                                    ...p,
                                    tasks: p.tasks.filter((t) => t.id !== task.id),
                                  }
                                : p
                            )
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {part.tasks.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No tasks added yet</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Summary */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Review & Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Job Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Job Number:</span> {jobNumber}
                </div>
                <div>
                  <span className="font-medium">Customer:</span> {customer}
                </div>
                <div>
                  <span className="font-medium">Due Date:</span> {dueDate}
                </div>
                <div>
                  <span className="font-medium">Parts:</span> {parts.length}
                </div>
                <div>
                  <span className="font-medium">Total Tasks:</span>{" "}
                  {parts.reduce((sum, part) => sum + part.tasks.length, 0)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Parts & Tasks Summary</h3>
              {parts.map((part) => (
                <div key={part.id} className="border rounded-lg p-3 mb-2">
                  <h4 className="font-semibold">{part.part_number}</h4>
                  <p className="text-sm text-gray-600">
                    {part.material} | {part.tasks.length} tasks
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {step < 4 ? (
          <Button onClick={handleNext}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => createJobMutation.mutate()}
            disabled={createJobMutation.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            {createJobMutation.isPending ? "Creating..." : "Create Job"}
          </Button>
        )}
      </div>
      </div>
    </Layout>
  );
}
