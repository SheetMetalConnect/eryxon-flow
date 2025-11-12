import { supabase } from "@/integrations/supabase/client";

interface IdMap {
  [key: string]: string;
}

export async function seedDemoData(tenantId: string) {
  // Avoid duplicating seed: if tenant already has cells or operations, do nothing
  const cellsHead = await supabase
    .from("cells")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if ((cellsHead.count || 0) > 0) {
    // Already seeded
  } else {
    // Create default cells
    const cellsToInsert = [
      { tenant_id: tenantId, name: "Cutting", color: "#ef4444", sequence: 1, active: true },
      { tenant_id: tenantId, name: "Bending", color: "#3b82f6", sequence: 2, active: true },
      { tenant_id: tenantId, name: "Welding", color: "#f59e0b", sequence: 3, active: true },
    ];
    const { error: cellErr } = await supabase.from("cells").insert(cellsToInsert);
    if (cellErr) throw cellErr;
  }

  // Fetch cell ids
  const { data: cellRows, error: cellFetchErr } = await supabase
    .from("cells")
    .select("id,name")
    .eq("tenant_id", tenantId)
    .order("sequence");
  if (cellFetchErr) throw cellFetchErr;
  const cellIdByName: IdMap = {};
  cellRows?.forEach((c) => (cellIdByName[c.name] = c.id));

  // If there are already jobs, skip the rest to avoid duplicates
  const jobsHead = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if ((jobsHead.count || 0) > 0) return;

  // Insert jobs
  const today = new Date();
  const addDays = (d: number) => new Date(today.getTime() + d * 86400000).toISOString();
  const jobsToInsert = [
    { tenant_id: tenantId, job_number: "JOB-001", customer: "Acme Corp", due_date: addDays(6) },
    { tenant_id: tenantId, job_number: "JOB-002", customer: "TechStart Inc", due_date: addDays(11) },
    { tenant_id: tenantId, job_number: "JOB-003", customer: "BuildRight Ltd", due_date: addDays(9) },
    { tenant_id: tenantId, job_number: "JOB-004", customer: "MetalWorks Co", due_date: addDays(13) },
    { tenant_id: tenantId, job_number: "JOB-005", customer: "Precision Parts", due_date: addDays(16) },
  ];
  const { data: jobs, error: jobsErr } = await supabase
    .from("jobs")
    .insert(jobsToInsert)
    .select("id,job_number");
  if (jobsErr) throw jobsErr;
  const jobId = (num: string) => jobs?.find((j) => j.job_number === num)?.id as string;

  // Insert parts
  const partsToInsert = [
    { tenant_id: tenantId, job_id: jobId("JOB-001"), part_number: "P-001-A", material: "steel", quantity: 10 },
    { tenant_id: tenantId, job_id: jobId("JOB-001"), part_number: "P-001-B", material: "steel", quantity: 5 },
    { tenant_id: tenantId, job_id: jobId("JOB-002"), part_number: "P-002-A", material: "aluminum", quantity: 15 },
    { tenant_id: tenantId, job_id: jobId("JOB-002"), part_number: "P-002-B", material: "aluminum", quantity: 8 },
    { tenant_id: tenantId, job_id: jobId("JOB-003"), part_number: "P-003-A", material: "stainless", quantity: 12 },
    { tenant_id: tenantId, job_id: jobId("JOB-003"), part_number: "P-003-B", material: "stainless", quantity: 6 },
    { tenant_id: tenantId, job_id: jobId("JOB-004"), part_number: "P-004-A", material: "steel", quantity: 20 },
    { tenant_id: tenantId, job_id: jobId("JOB-004"), part_number: "P-004-B", material: "aluminum", quantity: 10 },
    { tenant_id: tenantId, job_id: jobId("JOB-005"), part_number: "P-005-A", material: "stainless", quantity: 18 },
    { tenant_id: tenantId, job_id: jobId("JOB-005"), part_number: "P-005-B", material: "steel", quantity: 7 },
  ];
  const { data: parts, error: partsErr } = await supabase
    .from("parts")
    .insert(partsToInsert)
    .select("id,part_number");
  if (partsErr) throw partsErr;
  const partId = (pn: string) => parts?.find((p) => p.part_number === pn)?.id as string;

  // Insert operations (3 per part)
  const operationRows: any[] = [];
  const addOperations = (pn: string, names: [string, string, string]) => {
    operationRows.push(
      { tenant_id: tenantId, part_id: partId(pn), cell_id: cellIdByName["Cutting"], operation_name: names[0], sequence: 1, estimated_time: 30 },
      { tenant_id: tenantId, part_id: partId(pn), cell_id: cellIdByName["Bending"], operation_name: names[1], sequence: 2, estimated_time: 30 },
      { tenant_id: tenantId, part_id: partId(pn), cell_id: cellIdByName["Welding"], operation_name: names[2], sequence: 3, estimated_time: 45 },
    );
  };
  addOperations("P-001-A", ["Cut sheets", "Bend edges", "Weld joints"]);
  addOperations("P-001-B", ["Cut brackets", "Form brackets", "Weld assembly"]);
  addOperations("P-002-A", ["Cut aluminum sheets", "Bend panels", "Weld frame"]);
  addOperations("P-002-B", ["Cut support bars", "Form supports", "Tack weld"]);
  addOperations("P-003-A", ["Cut stainless plates", "Bend corners", "TIG weld seams"]);
  addOperations("P-003-B", ["Cut small parts", "Form details", "Spot weld"]);
  addOperations("P-004-A", ["Cut main panels", "Brake press", "MIG weld structure"]);
  addOperations("P-004-B", ["Cut angle pieces", "Fold tabs", "Weld connections"]);
  addOperations("P-005-A", ["Laser cut precision parts", "CNC bend", "Precision weld"]);
  addOperations("P-005-B", ["Cut end caps", "Roll form", "Final weld"]);

  const { error: operationsErr } = await supabase.from("operations").insert(operationRows);
  if (operationsErr) throw operationsErr;
}
