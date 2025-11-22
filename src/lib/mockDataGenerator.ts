import { supabase } from "@/integrations/supabase/client";

export interface MockDataOptions {
  includeCells?: boolean;
  includeJobs?: boolean;
  includeParts?: boolean;
  includeOperations?: boolean;
  includeResources?: boolean;
  includeOperators?: boolean;
  includeTimeEntries?: boolean;
  includeQuantityRecords?: boolean;
  includeIssues?: boolean;
}

/**
 * Generates comprehensive mock MES data for European/Dutch manufacturing
 * Creates realistic QRM-aligned workflows with complete data covering all app functions
 */
export async function generateMockData(
  tenantId: string,
  options: MockDataOptions = {
    includeCells: true,
    includeJobs: true,
    includeParts: true,
    includeOperations: true,
    includeResources: true,
    includeOperators: true,
    includeTimeEntries: true,
    includeQuantityRecords: true,
    includeIssues: true,
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    // CRITICAL: Validate tenant_id to prevent cross-tenant contamination
    if (!tenantId || tenantId.trim() === "") {
      throw new Error("tenant_id is required and cannot be empty");
    }

    console.log(
      `Starting comprehensive mock data generation for tenant: ${tenantId}...`,
    );

    // Check if tenant already has demo data to prevent duplicates
    const { data: isDemoMode, error: demoCheckError } = await supabase.rpc(
      "is_demo_mode",
      { p_tenant_id: tenantId },
    );

    if (demoCheckError) {
      console.warn("Could not check demo mode status:", demoCheckError);
    } else if (isDemoMode === true) {
      console.log(
        "⚠️ Tenant already has demo data. Skipping to prevent duplicates.",
      );
      return {
        success: false,
        error:
          "Demo data already exists for this tenant. Please clear existing demo data first.",
      };
    }

    // Step 1: Create QRM-aligned manufacturing cells with WIP limits
    let cellIds: string[] = [];
    const cellIdMap: Record<string, string> = {};

    if (options.includeCells) {
      const cells = [
        {
          tenant_id: tenantId,
          name: "Lasersnijden", // Laser Cutting
          sequence: 0,
          description: "High-precision fiber laser snijstation",
          color: "#3b82f6", // blue
          active: true,
          wip_limit: 15,
          enforce_wip_limit: false,
          wip_warning_threshold: 12,
          show_capacity_warning: true,
        },
        {
          tenant_id: tenantId,
          name: "CNC Kantbank", // CNC Bending
          sequence: 1,
          description: "Precisie kantbank en vouwbewerkingen",
          color: "#f59e0b", // amber
          active: true,
          wip_limit: 10,
          enforce_wip_limit: false,
          wip_warning_threshold: 8,
          show_capacity_warning: true,
        },
        {
          tenant_id: tenantId,
          name: "Lassen", // Welding
          sequence: 2,
          description: "MIG/TIG lassen en constructiewerk",
          color: "#ef4444", // red
          active: true,
          wip_limit: 8,
          enforce_wip_limit: true,
          wip_warning_threshold: 6,
          show_capacity_warning: true,
        },
        {
          tenant_id: tenantId,
          name: "Montage", // Assembly
          sequence: 3,
          description: "Eindmontage en hardware installatie",
          color: "#8b5cf6", // violet
          active: true,
          wip_limit: 12,
          enforce_wip_limit: false,
          wip_warning_threshold: 10,
          show_capacity_warning: true,
        },
        {
          tenant_id: tenantId,
          name: "Afwerking", // Finishing
          sequence: 4,
          description: "Poedercoaten en oppervlaktebehandeling",
          color: "#10b981", // green
          active: true,
          wip_limit: 20,
          enforce_wip_limit: false,
          wip_warning_threshold: 16,
          show_capacity_warning: true,
        },
        {
          tenant_id: tenantId,
          name: "Kwaliteitscontrole", // Quality Control
          sequence: 5,
          description: "Eindcontrole en kwaliteitsborging",
          color: "#6366f1", // indigo
          active: true,
          wip_limit: 15,
          enforce_wip_limit: false,
          wip_warning_threshold: 12,
          show_capacity_warning: true,
        },
      ];

      const { data: cellData, error: cellError } = await supabase
        .from("cells")
        .insert(cells)
        .select("id, name");

      if (cellError) throw cellError;

      cellIds = cellData?.map((c) => c.id) || [];
      cellData?.forEach((c, idx) => {
        cellIdMap[cells[idx].name] = c.id;
      });

      console.log("✓ Created 6 QRM cells with WIP limits");
    }

    // Step 2: Create demo operators with PINs
    let operatorIds: string[] = [];
    const operatorIdMap: Record<string, string> = {};

    if (options.includeOperators) {
      const operators = [
        {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          role: "operator" as const,
          username: "jan_devries",
          full_name: "Jan de Vries",
          email: "jan.devries@sheetmetalconnect.nl",
          active: true,
          pin: "1234",
        },
        {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          role: "operator" as const,
          username: "emma_bakker",
          full_name: "Emma Bakker",
          email: "emma.bakker@sheetmetalconnect.nl",
          active: true,
          pin: "2345",
        },
        {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          role: "operator" as const,
          username: "luuk_vandenberg",
          full_name: "Luuk van der Berg",
          email: "luuk.vandenberg@sheetmetalconnect.nl",
          active: true,
          pin: "3456",
        },
        {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          role: "operator" as const,
          username: "sophie_jansen",
          full_name: "Sophie Jansen",
          email: "sophie.jansen@sheetmetalconnect.nl",
          active: true,
          pin: "4567",
        },
        {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          role: "operator" as const,
          username: "daan_mulder",
          full_name: "Daan Mulder",
          email: "daan.mulder@sheetmetalconnect.nl",
          active: true,
          pin: "5678",
        },
        {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          role: "operator" as const,
          username: "lisa_visser",
          full_name: "Lisa Visser",
          email: "lisa.visser@sheetmetalconnect.nl",
          active: true,
          pin: "6789",
        },
      ];

      const { data: operatorData, error: operatorError } = await supabase
        .from("profiles")
        .insert(operators)
        .select("id, full_name");

      if (operatorError) throw operatorError;

      operatorIds = operatorData?.map((o) => o.id) || [];
      operatorData?.forEach((o, idx) => {
        operatorIdMap[operators[idx].full_name] = o.id;
      });

      console.log("✓ Created 6 operators with PINs");
    }

    // Step 3: Seed resources first (needed for operations)
    if (options.includeResources) {
      const { error: resourceSeedError } = await supabase.rpc(
        "seed_demo_resources",
        {
          p_tenant_id: tenantId,
        },
      );

      if (
        resourceSeedError &&
        !resourceSeedError.message?.includes("already exist")
      ) {
        console.warn("Resource seeding warning:", resourceSeedError);
      } else {
        console.log(
          "✓ Seeded demo resources (molds, tooling, fixtures, materials)",
        );
      }
    }

    // Step 4: Seed scrap reasons (needed for quantity records)
    const { error: scrapReasonsError } = await supabase.rpc(
      "seed_default_scrap_reasons",
      {
        p_tenant_id: tenantId,
      },
    );

    if (
      scrapReasonsError &&
      !scrapReasonsError.message?.includes("already exist")
    ) {
      console.warn("Scrap reasons warning:", scrapReasonsError);
    } else {
      console.log("✓ Seeded 31 default scrap reasons");
    }

    // Fetch resources and scrap reasons for later use
    const { data: resourceData } = await supabase
      .from("resources")
      .select("id, name, type")
      .eq("tenant_id", tenantId);

    const { data: scrapReasonData } = await supabase
      .from("scrap_reasons")
      .select("id, code, category")
      .eq("tenant_id", tenantId);

    // Step 5: Create realistic Dutch customer jobs
    let jobIds: string[] = [];
    const jobIdMap: Record<string, string> = {};

    if (options.includeJobs) {
      // Dates: Past in Oct/Nov 2025, Future in Jan 2026
      const oct15 = new Date("2025-10-15T09:00:00Z");
      const oct20 = new Date("2025-10-20T14:30:00Z");
      const nov05 = new Date("2025-11-05T08:15:00Z");
      const nov18 = new Date("2025-11-18T10:45:00Z");
      const jan10 = new Date("2026-01-10T00:00:00Z");
      const jan17 = new Date("2026-01-17T00:00:00Z");
      const jan24 = new Date("2026-01-24T00:00:00Z");
      const jan31 = new Date("2026-01-31T00:00:00Z");

      const jobs = [
        {
          tenant_id: tenantId,
          job_number: "WO-2025-1047",
          customer: "Van den Berg Machinebouw B.V.",
          notes:
            "Hydraulische hefframe - Urgente levering voor offshore project",
          status: "completed" as const,
          due_date: jan10.toISOString(),
          created_at: oct15.toISOString(),
          metadata: {
            orderValue: "€24.500",
            contactPerson: "Ing. P. van den Berg",
            deliveryAddress: "Rotterdam Haven",
          },
        },
        {
          tenant_id: tenantId,
          job_number: "WO-2025-1089",
          customer: "TechnoStaal Engineering",
          notes: "RVS bedieningspanelen voor cleanroom - ISO klasse 5 vereist",
          status: "in_progress" as const,
          due_date: jan17.toISOString(),
          created_at: oct20.toISOString(),
          metadata: {
            orderValue: "€18.750",
            contactPerson: "M. Schouten",
            deliveryAddress: "Eindhoven TU/e Campus",
          },
        },
        {
          tenant_id: tenantId,
          job_number: "WO-2025-1124",
          customer: "De Jong Installatietechniek",
          notes: "Aluminium behuizingen voor energieopslag - Herhaalorder Q4",
          status: "in_progress" as const,
          due_date: jan24.toISOString(),
          created_at: nov05.toISOString(),
          metadata: {
            orderValue: "€31.200",
            contactPerson: "R. de Jong",
            deliveryAddress: "Utrecht Science Park",
          },
        },
        {
          tenant_id: tenantId,
          job_number: "WO-2025-1156",
          customer: "ASML Supplier Services",
          notes:
            "Precisie framewerk voor semiconductor equipment - Tolerantie ±0.05mm",
          status: "in_progress" as const,
          due_date: jan31.toISOString(),
          created_at: nov18.toISOString(),
          metadata: {
            orderValue: "€67.800",
            contactPerson: "Dr. K. Vermeer",
            deliveryAddress: "Veldhoven ASML Campus",
            qualityLevel: "High-precision",
          },
        },
      ];

      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .insert(jobs)
        .select("id, job_number");

      if (jobError) throw jobError;

      jobIds = jobData?.map((j) => j.id) || [];
      jobData?.forEach((j, idx) => {
        jobIdMap[jobs[idx].job_number] = j.id;
      });

      console.log("✓ Created 4 realistic Dutch customer jobs");
    }

    // Step 6: Create parts with realistic Dutch naming
    let partIds: string[] = [];
    let partData: Array<{ id: string; part_number: string; job_id: string }> =
      [];

    if (options.includeParts && jobIds.length > 0) {
      const parts = [
        // WO-2025-1047 parts (completed job)
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1047"],
          part_number: "HF-FRAME-001",
          material: "S355J2",
          notes: "Hoofdframe hydraulische hef - Gelast constructiestaal",
          quantity: 2,
          status: "completed" as const,
          metadata: {
            dimensions: "1200x800x150mm",
            weight: "45.5kg",
            material_spec: "EN 10025-2",
            surface_treatment: "Gritstralen + Primer",
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1047"],
          part_number: "HF-BRACKET-002",
          material: "S355J2",
          notes: "Montagebeugels zijkant (set van 4)",
          quantity: 8,
          status: "completed" as const,
          metadata: {
            dimensions: "250x180x12mm",
            weight: "3.2kg",
            material_spec: "EN 10025-2",
          },
        },

        // WO-2025-1089 parts (in progress - cleanroom panels)
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1089"],
          part_number: "CR-PANEL-A1",
          material: "RVS 316L",
          notes: "Bedieningspaneel voorzijde - Cleanroom ISO 5",
          quantity: 12,
          status: "in_progress" as const,
          metadata: {
            dimensions: "400x300x2mm",
            weight: "2.8kg",
            material_spec: "EN 1.4404",
            surface_finish: "Elektropolish Ra<0.4μm",
            cleanroom_packaging: true,
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1089"],
          part_number: "CR-PANEL-B1",
          material: "RVS 316L",
          notes: "Bedieningspaneel zijkant links",
          quantity: 12,
          status: "in_progress" as const,
          metadata: {
            dimensions: "300x250x2mm",
            weight: "2.1kg",
            material_spec: "EN 1.4404",
            surface_finish: "Elektropolish Ra<0.4μm",
          },
        },

        // WO-2025-1124 parts (energy storage enclosures)
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1124"],
          part_number: "ESS-BOX-TOP",
          material: "AlMg3",
          notes: "Deksel energieopslag behuizing",
          quantity: 25,
          status: "in_progress" as const,
          metadata: {
            dimensions: "600x400x3mm",
            weight: "1.9kg",
            material_spec: "EN AW-5754",
            anodize_color: "Natural clear",
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1124"],
          part_number: "ESS-BOX-SIDE",
          material: "AlMg3",
          notes: "Zijpaneel behuizing (links/rechts identiek)",
          quantity: 50,
          status: "not_started" as const,
          metadata: {
            dimensions: "400x350x3mm",
            weight: "1.4kg",
            material_spec: "EN AW-5754",
          },
        },

        // WO-2025-1156 parts (ASML high-precision)
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1156"],
          part_number: "ASML-FRAME-MAIN",
          material: "RVS 304",
          notes: "Precisie framewerk - CMM inspectie verplicht",
          quantity: 4,
          status: "not_started" as const,
          metadata: {
            dimensions: "800x600x100mm",
            weight: "18.5kg",
            tolerance: "±0.05mm",
            material_spec: "EN 1.4301",
            inspection: "CMM + Material cert required",
            flatness: "< 0.02mm",
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1156"],
          part_number: "ASML-MOUNT-PLT",
          material: "RVS 304",
          notes: "Montageplaat precisie bewerkingen",
          quantity: 8,
          status: "not_started" as const,
          metadata: {
            dimensions: "300x200x15mm",
            weight: "6.8kg",
            tolerance: "±0.05mm",
            material_spec: "EN 1.4301",
          },
        },
      ];

      const { data: partsInserted, error: partError } = await supabase
        .from("parts")
        .insert(parts)
        .select("id, part_number, job_id");

      if (partError) throw partError;

      partIds = partsInserted?.map((p) => p.id) || [];
      partData = partsInserted || [];

      console.log("✓ Created 8 parts with realistic specifications");
    }

    // Step 7: Create QRM-aligned operations with proper routing
    let operationData: Array<{
      id: string;
      cell_id: string;
      part_id: string;
      status: string;
    }> = [];

    if (
      options.includeOperations &&
      partData.length > 0 &&
      cellIds.length > 0
    ) {
      const operations = [];

      // Helper to create operation routing for each part
      const createOperationRouting = (
        partId: string,
        partNumber: string,
        jobNumber: string,
        material: string,
        routing: Array<{
          cell: string;
          seq: number;
          operation_name: string;
          description: string;
          estimated_hours: number;
          status: string;
          metadata?: any;
        }>,
      ) => {
        routing.forEach((op) => {
          operations.push({
            tenant_id: tenantId,
            part_id: partId,
            cell_id: cellIdMap[op.cell],
            operation_number: `${partNumber}-${String(op.seq).padStart(3, "0")}`,
            operation_name: op.operation_name,
            description: op.description,
            sequence: op.seq,
            status: op.status,
            estimated_time: op.estimated_hours,
            metadata: op.metadata || {},
          });
        });
      };

      // WO-2025-1047 - HF-FRAME-001 (completed - heavy welded frame)
      const frame001 = partData.find((p) => p.part_number === "HF-FRAME-001");
      if (frame001) {
        createOperationRouting(
          frame001.id,
          "HF-FRAME-001",
          "WO-2025-1047",
          "S355J2",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Lasersnijden platen",
              description: "Fiber laser snijden hoofdplaten en verstevigingen",
              estimated_hours: 1.5,
              status: "completed",
              metadata: {
                program: "HF_FRAME_001_LASER.nc",
                material_thickness: "12mm",
                nest_efficiency: "87%",
              },
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Kanten versterkingsribben",
              description: "Kanten L-profielen voor versterkingsribben",
              estimated_hours: 0.8,
              status: "completed",
              metadata: {
                tooling: "V40-88deg",
                bend_count: 8,
                material: "S355",
              },
            },
            {
              cell: "Lassen",
              seq: 30,
              operation_name: "Constructie lassen",
              description:
                "MIG lassen hoofdconstructie + verstevigingen - WPS-NL-2024-089",
              estimated_hours: 4.5,
              status: "completed",
              metadata: {
                weld_procedure: "WPS-NL-2024-089",
                filler_material: "SG2 ø1.2mm",
                inspection: "VT+MT",
              },
            },
            {
              cell: "Afwerking",
              seq: 40,
              operation_name: "Gritstralen + Primer",
              description: "Gritstralen SA 2.5 + 2K epoxy primer 80μm",
              estimated_hours: 1.2,
              status: "completed",
              metadata: {
                grit_grade: "G40",
                primer: "Sigma SigmaGuard 720",
                dry_film_thickness: "80μm",
              },
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 50,
              operation_name: "Eindcontrole EN1090",
              description:
                "Dimensiecontrole + lascontrole + coating DFT meting",
              estimated_hours: 0.5,
              status: "completed",
              metadata: {
                standard: "EN1090-2 EXC2",
                weld_inspection: "VT+MT",
                coating_check: "DFT measurement",
              },
            },
          ],
        );
      }

      // WO-2025-1047 - HF-BRACKET-002 (completed brackets)
      const bracket002 = partData.find(
        (p) => p.part_number === "HF-BRACKET-002",
      );
      if (bracket002) {
        createOperationRouting(
          bracket002.id,
          "HF-BRACKET-002",
          "WO-2025-1047",
          "S355J2",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Lasersnijden",
              description: "Snijden beugels uit 12mm plaat",
              estimated_hours: 0.6,
              status: "completed",
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Kanten",
              description: "Kanten montagebeugels 90°",
              estimated_hours: 0.4,
              status: "completed",
              metadata: { bend_angle: 90, tooling: "V25-88deg" },
            },
            {
              cell: "Lassen",
              seq: 30,
              operation_name: "Tack lassen",
              description: "Punten lassen verstevigingsplaatjes",
              estimated_hours: 0.8,
              status: "completed",
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 40,
              operation_name: "Visuele controle",
              description: "Dimensie + lasnaad controle",
              estimated_hours: 0.2,
              status: "completed",
            },
          ],
        );
      }

      // WO-2025-1089 - CR-PANEL-A1 (in progress - cleanroom panels)
      const crPanelA1 = partData.find((p) => p.part_number === "CR-PANEL-A1");
      if (crPanelA1) {
        createOperationRouting(
          crPanelA1.id,
          "CR-PANEL-A1",
          "WO-2025-1089",
          "RVS 316L",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Lasersnijden RVS",
              description:
                "Fiber laser snijden 316L - 2mm plaat + uitsparingen",
              estimated_hours: 0.8,
              status: "completed",
              metadata: {
                program: "CR_PANEL_A1.nc",
                material: "EN1.4404",
                nitrogen_cutting: true,
              },
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Precisie kanten",
              description: "Kanten RVS 2x 90° - cleanroom tooling",
              estimated_hours: 0.5,
              status: "completed",
              metadata: {
                tooling: "V16-RVS-cleanroom",
                bend_sequence: [1, 2],
                radius: "3.2mm",
              },
            },
            {
              cell: "Lassen",
              seq: 30,
              operation_name: "TIG lassen",
              description:
                "TIG lassen montagepunten - Argon 99.999% - cleanroom weld",
              estimated_hours: 1.2,
              status: "in_progress",
              metadata: {
                weld_type: "TIG",
                filler: "ER316L ø1.6mm",
                shielding_gas: "Argon 5.0",
                cleanroom_weld: true,
              },
            },
            {
              cell: "Afwerking",
              seq: 40,
              operation_name: "Elektropolish",
              description:
                "Elektrochemisch polijsten Ra < 0.4μm voor cleanroom",
              estimated_hours: 0.6,
              status: "queued",
              metadata: {
                process: "Electropolish",
                target_roughness: "Ra < 0.4μm",
                clean_packaging: "ISO5 bags",
              },
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 50,
              operation_name: "Cleanroom inspectie",
              description: "Dimensie + Ra meting + particle test",
              estimated_hours: 0.4,
              status: "queued",
              metadata: {
                roughness_test: "Ra measurement",
                particle_test: "ISO 14644",
                material_cert: "EN 10204 3.1",
              },
            },
          ],
        );
      }

      // WO-2025-1089 - CR-PANEL-B1
      const crPanelB1 = partData.find((p) => p.part_number === "CR-PANEL-B1");
      if (crPanelB1) {
        createOperationRouting(
          crPanelB1.id,
          "CR-PANEL-B1",
          "WO-2025-1089",
          "RVS 316L",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Lasersnijden RVS",
              description: "Fiber laser snijden 316L zijpaneel",
              estimated_hours: 0.6,
              status: "completed",
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Kanten",
              description: "Kanten 3x 90°",
              estimated_hours: 0.4,
              status: "in_progress",
              metadata: { bend_count: 3 },
            },
            {
              cell: "Lassen",
              seq: 30,
              operation_name: "TIG lassen",
              description: "TIG lassen hoekverbindingen",
              estimated_hours: 0.8,
              status: "queued",
            },
            {
              cell: "Afwerking",
              seq: 40,
              operation_name: "Elektropolish",
              description: "Elektrochemisch polijsten",
              estimated_hours: 0.5,
              status: "queued",
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 50,
              operation_name: "Cleanroom inspectie",
              description: "Dimensie + oppervlakte controle",
              estimated_hours: 0.3,
              status: "queued",
            },
          ],
        );
      }

      // WO-2025-1124 - ESS-BOX-TOP (energy storage - aluminum)
      const essTop = partData.find((p) => p.part_number === "ESS-BOX-TOP");
      if (essTop) {
        createOperationRouting(
          essTop.id,
          "ESS-BOX-TOP",
          "WO-2025-1124",
          "AlMg3",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Lasersnijden aluminium",
              description: "Fiber laser snijden AlMg3 3mm + gaten/sleuven",
              estimated_hours: 0.7,
              status: "in_progress",
              metadata: {
                material: "EN AW-5754",
                thickness: "3mm",
                nitrogen_assist: true,
              },
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Kanten deksel",
              description: "Kanten 4x 90° voor dekselrand",
              estimated_hours: 0.5,
              status: "queued",
              metadata: { bend_count: 4, tooling: "V20-Alu" },
            },
            {
              cell: "Montage",
              seq: 30,
              operation_name: "Montage inserts",
              description: "Monteren draadinserts M6 voor bevestiging",
              estimated_hours: 0.3,
              status: "queued",
              metadata: { insert_type: "Helicoil M6", quantity: 8 },
            },
            {
              cell: "Afwerking",
              seq: 40,
              operation_name: "Anodiseren",
              description: "Anodiseren naturel helder 15μm",
              estimated_hours: 0.4,
              status: "queued",
              metadata: {
                anodize_type: "Clear natural",
                thickness: "15μm",
                standard: "EN 12373",
              },
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 50,
              operation_name: "Eindcontrole",
              description: "Dimensie + anodiseren laagdikte",
              estimated_hours: 0.2,
              status: "queued",
            },
          ],
        );
      }

      // WO-2025-1124 - ESS-BOX-SIDE
      const essSide = partData.find((p) => p.part_number === "ESS-BOX-SIDE");
      if (essSide) {
        createOperationRouting(
          essSide.id,
          "ESS-BOX-SIDE",
          "WO-2025-1124",
          "AlMg3",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Lasersnijden",
              description: "Snijden zijpanelen aluminium",
              estimated_hours: 0.9,
              status: "queued",
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Kanten",
              description: "Kanten montageranden",
              estimated_hours: 0.6,
              status: "queued",
            },
            {
              cell: "Afwerking",
              seq: 30,
              operation_name: "Anodiseren",
              description: "Anodiseren naturel",
              estimated_hours: 0.6,
              status: "queued",
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 40,
              operation_name: "Controle",
              description: "Steekproef dimensies",
              estimated_hours: 0.15,
              status: "queued",
            },
          ],
        );
      }

      // WO-2025-1156 - ASML-FRAME-MAIN (high precision)
      const asmlFrame = partData.find(
        (p) => p.part_number === "ASML-FRAME-MAIN",
      );
      if (asmlFrame) {
        createOperationRouting(
          asmlFrame.id,
          "ASML-FRAME-MAIN",
          "WO-2025-1156",
          "RVS 304",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Precisie lasersnijden",
              description: "Fiber laser snijden RVS304 - high precision mode",
              estimated_hours: 1.2,
              status: "queued",
              metadata: {
                precision_mode: true,
                tolerance: "±0.05mm",
                nitrogen_cutting: true,
              },
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Precisie kanten",
              description: "CNC kanten met angle measurement ±0.1°",
              estimated_hours: 1.5,
              status: "queued",
              metadata: {
                angle_tolerance: "±0.1°",
                tooling: "Precision V-die",
                back_gauge_accuracy: "±0.02mm",
              },
            },
            {
              cell: "Lassen",
              seq: 30,
              operation_name: "TIG precisie lassen",
              description: "TIG lassen - low distortion welding procedure",
              estimated_hours: 2.5,
              status: "queued",
              metadata: {
                weld_procedure: "Low-distortion TIG",
                fixturing: "Precision jig required",
                post_weld: "Stress relief",
              },
            },
            {
              cell: "Montage",
              seq: 40,
              operation_name: "Precisie montage",
              description: "Montage subassemblies - clean room assembly",
              estimated_hours: 1.0,
              status: "queued",
              metadata: {
                cleanroom_assembly: true,
                torque_spec: "Per ASML drawing",
              },
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 50,
              operation_name: "CMM inspectie",
              description:
                "Volledige CMM meting + materiaalcertificaat + inspectie rapport",
              estimated_hours: 1.5,
              status: "queued",
              metadata: {
                cmm_program: "ASML-FRAME-MAIN-CMM.prg",
                material_cert: "EN 10204 3.1 required",
                flatness_tolerance: "<0.02mm",
                inspection_report: "Full dimensional report + weld inspection",
              },
            },
          ],
        );
      }

      // WO-2025-1156 - ASML-MOUNT-PLT
      const asmlMount = partData.find(
        (p) => p.part_number === "ASML-MOUNT-PLT",
      );
      if (asmlMount) {
        createOperationRouting(
          asmlMount.id,
          "ASML-MOUNT-PLT",
          "WO-2025-1156",
          "RVS 304",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Lasersnijden",
              description: "Snijden montageplaten 15mm RVS",
              estimated_hours: 0.8,
              status: "queued",
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Kanten",
              description: "Kanten bevestigingsranden",
              estimated_hours: 0.6,
              status: "queued",
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 30,
              operation_name: "CMM controle",
              description: "CMM meting kritische maten",
              estimated_hours: 0.8,
              status: "queued",
              metadata: { cmm_required: true, tolerance: "±0.05mm" },
            },
          ],
        );
      }

      const { data: operationsInserted, error: operationsError } =
        await supabase
          .from("operations")
          .insert(operations)
          .select("id, cell_id, part_id, status");

      if (operationsError) throw operationsError;

      operationData = operationsInserted || [];
      console.log(
        `✓ Created ${operations.length} QRM-aligned operations with detailed routing`,
      );
    }

    // Step 8: Link resources to operations
    if (
      options.includeResources &&
      operationData.length > 0 &&
      resourceData &&
      resourceData.length > 0
    ) {
      const operationResources = [];

      // Resource mapping by cell
      const resourceMappings: Record<string, string[]> = {
        Lasersnijden: ["Laser Cutting Head"],
        "CNC Kantbank": ["V-Die", "Enclosure Mold", "Bracket Forming Die"],
        Lassen: ["Spot Welding Gun", "Welding Fixture"],
        Montage: [],
        Afwerking: [],
        Kwaliteitscontrole: ["QC Inspection Gauge"],
      };

      for (const op of operationData) {
        const cell = Object.entries(cellIdMap).find(
          ([_, id]) => id === op.cell_id,
        )?.[0];
        if (!cell) continue;

        const resourceNames = resourceMappings[cell] || [];

        for (const resourceName of resourceNames) {
          const resource = resourceData.find((r) =>
            r.name.includes(resourceName),
          );
          if (resource) {
            operationResources.push({
              operation_id: op.id,
              resource_id: resource.id,
              quantity: 1,
              notes: `Benodigd voor ${cell}`,
            });
          }
        }
      }

      if (operationResources.length > 0) {
        const { error: linkError } = await supabase
          .from("operation_resources")
          .insert(operationResources);

        if (linkError) {
          console.warn("Resource linking warning:", linkError);
        } else {
          console.log(
            `✓ Linked ${operationResources.length} resources to operations`,
          );
        }
      }
    }

    // Step 9: Create time entries for completed and in-progress operations
    if (
      options.includeTimeEntries &&
      operationData.length > 0 &&
      operatorIds.length > 0
    ) {
      const timeEntries = [];

      // Get completed and in-progress operations
      const workableOps = operationData.filter(
        (op) => op.status === "completed" || op.status === "in_progress",
      );

      for (const op of workableOps) {
        // Randomly assign 1-2 operators who worked on this
        const numOperators = Math.random() > 0.7 ? 2 : 1;
        const selectedOperators = operatorIds
          .sort(() => Math.random() - 0.5)
          .slice(0, numOperators);

        for (const operatorId of selectedOperators) {
          // Create realistic time entries in Oct/Nov 2025
          const baseDate = new Date("2025-10-15T08:00:00Z");
          const daysOffset = Math.floor(Math.random() * 45); // 45 days range
          const startHour = 8 + Math.floor(Math.random() * 8); // Between 8:00 and 16:00

          const startTime = new Date(baseDate);
          startTime.setDate(startTime.getDate() + daysOffset);
          startTime.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);

          const durationMinutes = 30 + Math.floor(Math.random() * 180); // 30 min to 3 hours
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + durationMinutes);

          if (op.status === "completed") {
            timeEntries.push({
              tenant_id: tenantId,
              operation_id: op.id,
              operator_id: operatorId,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              duration: durationMinutes,
              time_type: "productive",
              notes: numOperators > 1 ? "Teamwork met collega" : null,
            });
          } else if (op.status === "in_progress") {
            // For in-progress, some have end time, some don't
            const hasEnded = Math.random() > 0.3;
            timeEntries.push({
              tenant_id: tenantId,
              operation_id: op.id,
              operator_id: operatorId,
              start_time: startTime.toISOString(),
              end_time: hasEnded ? endTime.toISOString() : null,
              duration: hasEnded ? durationMinutes : null,
              time_type: "productive",
              is_paused: !hasEnded && Math.random() > 0.7,
            });
          }
        }
      }

      if (timeEntries.length > 0) {
        const { error: timeError } = await supabase
          .from("time_entries")
          .insert(timeEntries);

        if (timeError) {
          console.warn("Time entries warning:", timeError);
        } else {
          console.log(
            `✓ Created ${timeEntries.length} time entries for operators`,
          );
        }
      }
    }

    // Step 10: Create quantity records with some scrap
    if (
      options.includeQuantityRecords &&
      operationData.length > 0 &&
      scrapReasonData &&
      scrapReasonData.length > 0
    ) {
      const quantityRecords = [];

      // Only create quantity records for completed operations
      const completedOps = operationData.filter(
        (op) => op.status === "completed",
      );

      for (const op of completedOps) {
        // Find the part to get quantity
        const part = partData.find((p) => p.id === op.part_id);
        if (!part) continue;

        const totalQuantity = Math.min(10, Math.floor(Math.random() * 5) + 3); // 3-7 pieces or 10 max
        const scrapQty =
          Math.random() > 0.7 ? Math.floor(Math.random() * 2) : 0; // 0-1 scrap
        const reworkQty = Math.random() > 0.85 ? 1 : 0;
        const goodQty = totalQuantity - scrapQty - reworkQty;

        const scrapReason =
          scrapQty > 0
            ? scrapReasonData[
                Math.floor(Math.random() * scrapReasonData.length)
              ]
            : null;

        const recordDate = new Date("2025-10-20T00:00:00Z");
        recordDate.setDate(
          recordDate.getDate() + Math.floor(Math.random() * 40),
        );

        quantityRecords.push({
          tenant_id: tenantId,
          operation_id: op.id,
          quantity_produced: totalQuantity,
          quantity_good: goodQty,
          quantity_scrap: scrapQty,
          quantity_rework: reworkQty,
          scrap_reason_id: scrapReason?.id || null,
          recorded_by:
            operatorIds[Math.floor(Math.random() * operatorIds.length)],
          recorded_at: recordDate.toISOString(),
          notes:
            scrapQty > 0
              ? `${scrapQty} stuks afgekeurd: ${scrapReason?.code}`
              : null,
          material_lot: `LOT-2025-${Math.floor(Math.random() * 9000) + 1000}`,
          material_supplier: [
            "Thyssenkrupp",
            "Tata Steel",
            "Aalco Metals",
            "Montanstahl",
          ][Math.floor(Math.random() * 4)],
        });
      }

      if (quantityRecords.length > 0) {
        const { error: qtyError } = await supabase
          .from("operation_quantities")
          .insert(quantityRecords);

        if (qtyError) {
          console.warn("Quantity records warning:", qtyError);
        } else {
          console.log(
            `✓ Created ${quantityRecords.length} quantity records with scrap tracking`,
          );
        }
      }
    }

    // Step 11: Create some issues/NCRs
    if (
      options.includeIssues &&
      operationData.length > 0 &&
      operatorIds.length > 0
    ) {
      const issues = [];

      // Create 2-4 issues across different operations
      const numIssues = 2 + Math.floor(Math.random() * 3);
      const selectedOps = operationData
        .sort(() => Math.random() - 0.5)
        .slice(0, numIssues);

      const issueTemplates = [
        {
          severity: "medium" as const,
          description:
            "Materiaal dikte afwijking geconstateerd - 2.8mm gemeten ipv 3.0mm specificatie. Materiaal certificaat controle nodig.",
          resolution:
            "Materiaal goedgekeurd na overleg kwaliteit - binnen toegestane tolerantie EN 10051",
          status: "resolved" as const,
        },
        {
          severity: "high" as const,
          description:
            "Lasnaad poreus - visuele controle toont meerdere poriën in lasnaad. Niet conform WPS procedure.",
          resolution:
            "Lasnaad uitgeslepen en opnieuw gelast met nieuwe WPS parameters. VT controle OK.",
          status: "resolved" as const,
        },
        {
          severity: "low" as const,
          description:
            "Kanthoek afwijking - gemeten 89.2° ipv 90° specificatie op 2 kanten.",
          resolution: null,
          status: "open" as const,
        },
        {
          severity: "medium" as const,
          description:
            "Oppervlakte kwaliteit niet conform - krassen aanwezig na polijsten. Ra meting 0.52μm (spec: <0.4μm)",
          resolution:
            "Onderdeel opnieuw gepolijst - Ra meting 0.35μm - goedgekeurd",
          status: "resolved" as const,
        },
        {
          severity: "high" as const,
          description:
            "Dimensie out-of-tolerance - gat positie 0.15mm afwijking (spec: ±0.05mm). CMM meting bijgevoegd.",
          resolution: null,
          status: "in_review" as const,
        },
      ];

      selectedOps.forEach((op, idx) => {
        const template = issueTemplates[idx % issueTemplates.length];
        const createdDate = new Date("2025-11-01T00:00:00Z");
        createdDate.setDate(
          createdDate.getDate() + Math.floor(Math.random() * 25),
        );

        const issue: any = {
          tenant_id: tenantId,
          operation_id: op.id,
          created_by:
            operatorIds[Math.floor(Math.random() * operatorIds.length)],
          severity: template.severity,
          description: template.description,
          status: template.status,
          created_at: createdDate.toISOString(),
        };

        if (template.resolution) {
          issue.resolution_notes = template.resolution;
          const resolvedDate = new Date(createdDate);
          resolvedDate.setDate(
            resolvedDate.getDate() + Math.floor(Math.random() * 3) + 1,
          );
          issue.reviewed_at = resolvedDate.toISOString();
          issue.reviewed_by =
            operatorIds[Math.floor(Math.random() * operatorIds.length)];
        }

        issues.push(issue);
      });

      if (issues.length > 0) {
        const { error: issuesError } = await supabase
          .from("issues")
          .insert(issues);

        if (issuesError) {
          console.warn("Issues creation warning:", issuesError);
        } else {
          console.log(`✓ Created ${issues.length} quality issues (NCRs)`);
        }
      }
    }

    // Enable demo mode flag now that seeding is complete
    const { error: demoModeError } = await supabase.rpc("enable_demo_mode", {
      p_tenant_id: tenantId,
      p_user_id: null, // Could be passed from context if available
    });

    if (demoModeError) {
      console.warn("Could not set demo mode flag:", demoModeError);
      // Continue anyway - data is created successfully
    } else {
      console.log("✓ Demo mode flag enabled for tenant");
    }

    console.log("✅ Mock data generation completed successfully!");
    return { success: true };
  } catch (error) {
    console.error("Error generating mock data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Clears all mock data for a tenant
 * CRITICAL: All deletions MUST be scoped to tenant_id to prevent cross-tenant contamination
 * Useful for resetting during onboarding
 */
export async function clearMockData(
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!tenantId) {
      throw new Error("tenant_id is required for clearMockData");
    }

    console.log(`Clearing all mock data for tenant: ${tenantId}...`);

    // CRITICAL: Delete in reverse order of dependencies
    // All deletions MUST include tenant_id filter to prevent cross-tenant contamination

    // 1. Delete issues (has tenant_id)
    const { error: issuesErr } = await supabase
      .from("issues")
      .delete()
      .eq("tenant_id", tenantId);
    if (issuesErr) console.warn("Issues deletion warning:", issuesErr);

    // 2. Delete operation_quantities (has tenant_id)
    const { error: qtyErr } = await supabase
      .from("operation_quantities")
      .delete()
      .eq("tenant_id", tenantId);
    if (qtyErr) console.warn("Quantity records deletion warning:", qtyErr);

    // 3. Delete time_entries (has tenant_id)
    const { error: timeErr } = await supabase
      .from("time_entries")
      .delete()
      .eq("tenant_id", tenantId);
    if (timeErr) console.warn("Time entries deletion warning:", timeErr);

    // 4. Delete operation_resources (NO tenant_id - must filter through operations)
    // CRITICAL: We must get operation IDs first to ensure tenant isolation
    const { data: tenantOperations, error: opFetchErr } = await supabase
      .from("operations")
      .select("id")
      .eq("tenant_id", tenantId);

    if (opFetchErr) {
      console.warn("Operation fetch warning:", opFetchErr);
    } else if (tenantOperations && tenantOperations.length > 0) {
      const operationIds = tenantOperations.map((op) => op.id);
      const { error: opResErr } = await supabase
        .from("operation_resources")
        .delete()
        .in("operation_id", operationIds);
      if (opResErr)
        console.warn("Operation resources deletion warning:", opResErr);
    }

    // 5. Delete operations (has tenant_id)
    const { error: opsErr } = await supabase
      .from("operations")
      .delete()
      .eq("tenant_id", tenantId);
    if (opsErr) console.warn("Operations deletion warning:", opsErr);

    // 6. Delete parts (has tenant_id)
    const { error: partsErr } = await supabase
      .from("parts")
      .delete()
      .eq("tenant_id", tenantId);
    if (partsErr) console.warn("Parts deletion warning:", partsErr);

    // 7. Delete jobs (has tenant_id)
    const { error: jobsErr } = await supabase
      .from("jobs")
      .delete()
      .eq("tenant_id", tenantId);
    if (jobsErr) console.warn("Jobs deletion warning:", jobsErr);

    // 8. Delete cells (has tenant_id)
    const { error: cellsErr } = await supabase
      .from("cells")
      .delete()
      .eq("tenant_id", tenantId);
    if (cellsErr) console.warn("Cells deletion warning:", cellsErr);

    // 9. Delete resources (has tenant_id)
    const { error: resourcesErr } = await supabase
      .from("resources")
      .delete()
      .eq("tenant_id", tenantId);
    if (resourcesErr) console.warn("Resources deletion warning:", resourcesErr);

    // 10. Delete scrap_reasons (has tenant_id)
    const { error: scrapErr } = await supabase
      .from("scrap_reasons")
      .delete()
      .eq("tenant_id", tenantId);
    if (scrapErr) console.warn("Scrap reasons deletion warning:", scrapErr);

    // 11. Delete demo operators (has tenant_id + email filter for safety)
    // CRITICAL: Double filter by both tenant_id AND email to ensure only demo operators are deleted
    const { error: profilesErr } = await supabase
      .from("profiles")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("role", "operator")
      .in("email", [
        "jan.devries@sheetmetalconnect.nl",
        "emma.bakker@sheetmetalconnect.nl",
        "luuk.vandenberg@sheetmetalconnect.nl",
        "sophie.jansen@sheetmetalconnect.nl",
        "daan.mulder@sheetmetalconnect.nl",
        "lisa.visser@sheetmetalconnect.nl",
      ]);
    if (profilesErr)
      console.warn("Demo operators deletion warning:", profilesErr);

    // Disable demo mode flag now that data is cleared
    const { error: demoModeError } = await supabase.rpc("disable_demo_mode", {
      p_tenant_id: tenantId,
    });

    if (demoModeError) {
      console.warn("Could not clear demo mode flag:", demoModeError);
      // Continue anyway - data is deleted successfully
    } else {
      console.log("✓ Demo mode flag disabled for tenant");
    }

    console.log(`✅ Mock data cleared successfully for tenant: ${tenantId}`);
    return { success: true };
  } catch (error) {
    console.error("Error clearing mock data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
