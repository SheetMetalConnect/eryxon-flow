import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface MockDataProgressStep {
  step: number;
  totalSteps: number;
  label: string;
  percentage: number;
}

export type MockDataProgressCallback = (progress: MockDataProgressStep) => void;

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
  includeCalendar?: boolean;
  onProgress?: MockDataProgressCallback;
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
    includeCalendar: true,
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    // CRITICAL: Validate tenant_id to prevent cross-tenant contamination
    if (!tenantId || tenantId.trim() === "") {
      throw new Error("tenant_id is required and cannot be empty");
    }

    logger.debug(
      'MockData',
      `Starting comprehensive mock data generation for tenant: ${tenantId}...`,
    );

    const totalSteps = 11;
    const reportProgress = (step: number, label: string) => {
      const percentage = Math.round((step / totalSteps) * 100);
      options.onProgress?.({ step, totalSteps, label, percentage });
    };

    // Check if tenant already has demo data to prevent duplicates
    // Skip this check for testing/specific tenants (configured via env var)
    const testTenantId = import.meta.env.VITE_TEST_TENANT_ID;
    const skipDemoCheck = testTenantId ? tenantId === testTenantId : false;
    
    if (!skipDemoCheck) {
      const { data: isDemoMode, error: demoCheckError } = await supabase.rpc(
        "is_demo_mode",
        { p_tenant_id: tenantId },
      );

      if (demoCheckError) {
        logger.warn('MockData', 'Could not check demo mode status:', demoCheckError);
      } else if (isDemoMode === true) {
        logger.debug(
          'MockData',
          'Tenant already has demo data. Skipping to prevent duplicates.',
        );
        return {
          success: false,
          error:
            "Demo data already exists for this tenant. Please clear existing demo data first.",
        };
      }
    }

    reportProgress(1, 'cells');
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

      logger.debug('MockData', 'Created 6 QRM cells with WIP limits');
    }

    reportProgress(2, 'calendar');
    if (options.includeCalendar) {
      const dutchHolidays: Array<{ date: string; day_type: string; name: string; capacity_multiplier: number; opening_time?: string; closing_time?: string; notes?: string }> = [
        { date: '2025-01-01', day_type: 'holiday', name: 'Nieuwjaarsdag', capacity_multiplier: 0 },
        { date: '2025-04-18', day_type: 'holiday', name: 'Goede Vrijdag', capacity_multiplier: 0 },
        { date: '2025-04-20', day_type: 'holiday', name: 'Eerste Paasdag', capacity_multiplier: 0 },
        { date: '2025-04-21', day_type: 'holiday', name: 'Tweede Paasdag', capacity_multiplier: 0 },
        { date: '2025-04-26', day_type: 'holiday', name: 'Koningsdag', capacity_multiplier: 0, notes: 'Koningsdag valt op zondag, gevierd op zaterdag' },
        { date: '2025-05-05', day_type: 'holiday', name: 'Bevrijdingsdag', capacity_multiplier: 0 },
        { date: '2025-05-29', day_type: 'holiday', name: 'Hemelvaartsdag', capacity_multiplier: 0 },
        { date: '2025-05-30', day_type: 'closure', name: 'Brugdag Hemelvaart', capacity_multiplier: 0, notes: 'Fabriek gesloten - brugdag' },
        { date: '2025-06-08', day_type: 'holiday', name: 'Eerste Pinksterdag', capacity_multiplier: 0 },
        { date: '2025-06-09', day_type: 'holiday', name: 'Tweede Pinksterdag', capacity_multiplier: 0 },
        { date: '2025-12-24', day_type: 'half_day', name: 'Kerstavond', capacity_multiplier: 0.5, opening_time: '08:00', closing_time: '12:00', notes: 'Fabriek sluit om 12:00' },
        { date: '2025-12-25', day_type: 'holiday', name: 'Eerste Kerstdag', capacity_multiplier: 0 },
        { date: '2025-12-26', day_type: 'holiday', name: 'Tweede Kerstdag', capacity_multiplier: 0 },
        { date: '2025-12-29', day_type: 'closure', name: 'Kerstvakantie', capacity_multiplier: 0, notes: 'Fabriek gesloten tussen Kerst en Nieuwjaar' },
        { date: '2025-12-30', day_type: 'closure', name: 'Kerstvakantie', capacity_multiplier: 0, notes: 'Fabriek gesloten tussen Kerst en Nieuwjaar' },
        { date: '2025-12-31', day_type: 'half_day', name: 'Oudejaarsdag', capacity_multiplier: 0.5, opening_time: '08:00', closing_time: '12:00', notes: 'Fabriek sluit om 12:00' },
        { date: '2026-01-01', day_type: 'holiday', name: 'Nieuwjaarsdag', capacity_multiplier: 0 },
        { date: '2026-01-02', day_type: 'closure', name: 'Brugdag Nieuwjaar', capacity_multiplier: 0, notes: 'Fabriek gesloten - brugdag' },
        { date: '2026-04-03', day_type: 'holiday', name: 'Goede Vrijdag', capacity_multiplier: 0 },
        { date: '2026-04-05', day_type: 'holiday', name: 'Eerste Paasdag', capacity_multiplier: 0 },
        { date: '2026-04-06', day_type: 'holiday', name: 'Tweede Paasdag', capacity_multiplier: 0 },
        { date: '2026-04-27', day_type: 'holiday', name: 'Koningsdag', capacity_multiplier: 0 },
        { date: '2026-05-05', day_type: 'holiday', name: 'Bevrijdingsdag', capacity_multiplier: 0 },
        { date: '2026-05-14', day_type: 'holiday', name: 'Hemelvaartsdag', capacity_multiplier: 0 },
        { date: '2026-05-15', day_type: 'closure', name: 'Brugdag Hemelvaart', capacity_multiplier: 0, notes: 'Fabriek gesloten - brugdag' },
        { date: '2026-05-24', day_type: 'holiday', name: 'Eerste Pinksterdag', capacity_multiplier: 0 },
        { date: '2026-05-25', day_type: 'holiday', name: 'Tweede Pinksterdag', capacity_multiplier: 0 },
        { date: '2026-12-24', day_type: 'half_day', name: 'Kerstavond', capacity_multiplier: 0.5, opening_time: '08:00', closing_time: '12:00', notes: 'Fabriek sluit om 12:00' },
        { date: '2026-12-25', day_type: 'holiday', name: 'Eerste Kerstdag', capacity_multiplier: 0 },
        { date: '2026-12-26', day_type: 'holiday', name: 'Tweede Kerstdag', capacity_multiplier: 0 },
        { date: '2026-12-28', day_type: 'closure', name: 'Kerstvakantie', capacity_multiplier: 0, notes: 'Fabriek gesloten tussen Kerst en Nieuwjaar' },
        { date: '2026-12-29', day_type: 'closure', name: 'Kerstvakantie', capacity_multiplier: 0, notes: 'Fabriek gesloten tussen Kerst en Nieuwjaar' },
        { date: '2026-12-30', day_type: 'closure', name: 'Kerstvakantie', capacity_multiplier: 0, notes: 'Fabriek gesloten tussen Kerst en Nieuwjaar' },
        { date: '2026-12-31', day_type: 'half_day', name: 'Oudejaarsdag', capacity_multiplier: 0.5, opening_time: '08:00', closing_time: '12:00', notes: 'Fabriek sluit om 12:00' },
      ];

      const calendarEntries = dutchHolidays.map(holiday => ({
        tenant_id: tenantId,
        date: holiday.date,
        day_type: holiday.day_type,
        name: holiday.name,
        opening_time: holiday.opening_time || null,
        closing_time: holiday.closing_time || null,
        capacity_multiplier: holiday.capacity_multiplier,
        notes: holiday.notes || null,
      }));

      const { error: calendarError } = await supabase
        .from("factory_calendar")
        .upsert(calendarEntries, { onConflict: 'tenant_id,date' });

      if (calendarError) {
        logger.warn('MockData', 'Calendar seeding warning:', calendarError);
      } else {
        logger.debug('MockData', `Seeded ${calendarEntries.length} Dutch holidays and factory closures`);
      }
    }

    reportProgress(3, 'operators');
    // Note: pin_hash is left NULL - operators can set PINs later via UI if needed
    let operatorIds: string[] = [];
    const operatorIdMap: Record<string, string> = {};

    if (options.includeOperators) {
      try {
        const { data: existingOps } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("tenant_id", tenantId)
          .eq("role", "operator")
          .like("email", "%@example.com");

        if (existingOps && existingOps.length > 0) {
          logger.debug('MockData', `${existingOps.length} demo operators already exist`);
          operatorIds = existingOps.map((o) => o.id);
          existingOps.forEach((o) => {
            operatorIdMap[o.full_name] = o.id;
          });
        } else {
          // RPC handles auth.users constraint
          const { error: rpcError } = await supabase.rpc(
            "seed_demo_operators",
            {
              p_tenant_id: tenantId,
            },
          );

          if (rpcError) {
            logger.warn(
              'MockData',
              'Operator seeding skipped (requires auth setup):',
              rpcError.message,
            );
            logger.debug(
              'MockData',
              'Demo will continue without operators (operations will be unassigned)',
            );
          } else {
            const { data: createdOps } = await supabase
              .from("profiles")
              .select("id, full_name")
              .eq("tenant_id", tenantId)
              .eq("role", "operator")
              .like("email", "%@example.com");

            if (createdOps && createdOps.length > 0) {
              operatorIds = createdOps.map((o) => o.id);
              createdOps.forEach((o) => {
                operatorIdMap[o.full_name] = o.id;
              });
              logger.debug('MockData', `Created ${createdOps.length} shop floor operators`);
            }
          }
        }
      } catch (err) {
        logger.warn('MockData', 'Operator setup failed, continuing without:', err);
      }
    }

    reportProgress(4, 'resources');
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
        logger.warn('MockData', 'Resource seeding warning:', resourceSeedError);
      } else {
        logger.debug(
          'MockData',
          'Seeded demo resources (molds, tooling, fixtures, materials)',
        );
      }
    }

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
      logger.warn('MockData', 'Scrap reasons warning:', scrapReasonsError);
    } else {
      logger.debug('MockData', 'Seeded 31 default scrap reasons');
    }

    const { data: resourceData } = await supabase
      .from("resources")
      .select("id, name, type")
      .eq("tenant_id", tenantId);

    const { data: scrapReasonData } = await supabase
      .from("scrap_reasons")
      .select("id, code, category")
      .eq("tenant_id", tenantId);

    reportProgress(5, 'jobs');
    let jobIds: string[] = [];
    const jobIdMap: Record<string, string> = {};

    if (options.includeJobs) {
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
          customer: "HighTech Precision B.V.",
          notes:
            "Precisie framewerk voor semiconductor equipment - Tolerantie ±0.05mm",
          status: "in_progress" as const,
          due_date: jan31.toISOString(),
          created_at: nov18.toISOString(),
          metadata: {
            orderValue: "€67.800",
            contactPerson: "Dr. K. Vermeer",
            deliveryAddress: "Veldhoven Tech Campus",
            qualityLevel: "High-precision",
          },
        },
        {
          tenant_id: tenantId,
          job_number: "WO-2025-1178",
          customer: "Luchtvaart Componenten Nederland",
          notes: "Luchtvaart beugels - AS9100 certificering vereist",
          status: "in_progress" as const,
          due_date: new Date("2026-02-15T00:00:00Z").toISOString(),
          created_at: new Date("2025-11-20T11:00:00Z").toISOString(),
          metadata: {
            orderValue: "€42.500",
            contactPerson: "Ir. M. de Vries",
            deliveryAddress: "Papendrecht Industrieterrein",
            qualityLevel: "Aerospace",
            certification: "AS9100D",
          },
        },
        {
          tenant_id: tenantId,
          job_number: "WO-2025-1195",
          customer: "MedTech Solutions B.V.",
          notes: "Medische apparatuur behuizing - EN ISO 13485",
          status: "not_started" as const,
          due_date: new Date("2026-02-28T00:00:00Z").toISOString(),
          created_at: new Date("2025-11-22T09:30:00Z").toISOString(),
          metadata: {
            orderValue: "€28.900",
            contactPerson: "Dr. L. Bakker",
            deliveryAddress: "Best Medisch Park",
            qualityLevel: "Medical",
            certification: "EN ISO 13485",
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

      logger.debug('MockData', 'Created 6 realistic Dutch customer jobs');
    }

    reportProgress(6, 'parts');
    let partIds: string[] = [];
    let partData: Array<{ id: string; part_number: string; job_id: string; parent_part_id?: string | null }> = [];

    if (options.includeParts && jobIds.length > 0) {
      const parentParts = [
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1047"],
          part_number: "HF-FRAME-001",
          material: "S355J2",
          notes: "Hoofdframe hydraulische hef - Gelast constructiestaal",
          quantity: 2,
          status: "completed" as const,
          parent_part_id: null as string | null,
          metadata: {
            dimensions: "1200x800x150mm",
            weight: "45.5kg",
            material_spec: "EN 10025-2",
            surface_treatment: "Gritstralen + Primer",
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1089"],
          part_number: "CR-PANEL-A1",
          material: "RVS 316L",
          notes: "Bedieningspaneel voorzijde - Cleanroom ISO 5",
          quantity: 12,
          status: "in_progress" as const,
          parent_part_id: null as string | null,
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
          job_id: jobIdMap["WO-2025-1124"],
          part_number: "ESS-BOX-TOP",
          material: "AlMg3",
          notes: "Deksel energieopslag behuizing - Parent assembly",
          quantity: 25,
          status: "in_progress" as const,
          parent_part_id: null as string | null,
          metadata: {
            dimensions: "600x400x3mm",
            weight: "1.9kg",
            material_spec: "EN AW-5754",
            anodize_color: "Natural clear",
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1156"],
          part_number: "HTP-FRAME-MAIN",
          material: "RVS 304",
          notes: "Precisie framewerk - CMM inspectie verplicht",
          quantity: 4,
          status: "not_started" as const,
          parent_part_id: null as string | null,
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
          job_id: jobIdMap["WO-2025-1178"],
          part_number: "FK-BRACKET-A1",
          material: "Aluminium 7075-T6",
          notes: "Luchtvaart beugel - AS9100 traceability",
          quantity: 16,
          status: "in_progress" as const,
          parent_part_id: null as string | null,
          metadata: {
            dimensions: "180x120x8mm",
            weight: "0.45kg",
            tolerance: "±0.1mm",
            material_spec: "AMS-QQ-A-250/12",
            certification: "AS9100D",
            traceability: "Full lot traceability required",
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1195"],
          part_number: "PH-MED-HOUSING",
          material: "RVS 316L",
          notes: "Medische behuizing - biocompatibel",
          quantity: 6,
          status: "not_started" as const,
          parent_part_id: null as string | null,
          metadata: {
            dimensions: "350x280x120mm",
            weight: "4.2kg",
            material_spec: "EN 1.4404",
            certification: "EN ISO 13485",
            surface_finish: "Ra < 0.8μm",
            biocompatible: true,
          },
        },
      ];

      logger.debug('MockData', 'Inserting parent parts...');
      const { data: parentPartsData, error: parentError } = await supabase
        .from("parts")
        .insert(parentParts)
        .select("id, part_number, job_id, parent_part_id");

      if (parentError) {
        logger.error('MockData', 'Parent parts error:', parentError);
        throw parentError;
      }

      logger.debug('MockData', `Created ${parentPartsData?.length || 0} parent parts`);

      const partIdLookup: Record<string, string> = {};
      parentPartsData?.forEach((p) => {
        partIdLookup[p.part_number] = p.id;
      });

      const childParts = [
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1047"],
          part_number: "HF-BRACKET-002",
          material: "S355J2",
          notes: "Montagebeugels zijkant - Child of HF-FRAME-001",
          quantity: 8,
          status: "completed" as const,
          parent_part_id: partIdLookup["HF-FRAME-001"],
          metadata: {
            dimensions: "250x180x12mm",
            weight: "3.2kg",
            material_spec: "EN 10025-2",
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1089"],
          part_number: "CR-PANEL-B1",
          material: "RVS 316L",
          notes: "Bedieningspaneel zijkant - Child of CR-PANEL-A1",
          quantity: 12,
          status: "in_progress" as const,
          parent_part_id: partIdLookup["CR-PANEL-A1"],
          metadata: {
            dimensions: "300x250x2mm",
            weight: "2.1kg",
            material_spec: "EN 1.4404",
            surface_finish: "Elektropolish Ra<0.4μm",
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1124"],
          part_number: "ESS-BOX-SIDE",
          material: "AlMg3",
          notes: "Zijpaneel behuizing - Child of ESS-BOX-TOP",
          quantity: 50,
          status: "not_started" as const,
          parent_part_id: partIdLookup["ESS-BOX-TOP"],
          metadata: {
            dimensions: "400x350x3mm",
            weight: "1.4kg",
            material_spec: "EN AW-5754",
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1156"],
          part_number: "HTP-MOUNT-PLT",
          material: "RVS 304",
          notes: "Montageplaat precisie - Child of HTP-FRAME-MAIN",
          quantity: 8,
          status: "not_started" as const,
          parent_part_id: partIdLookup["HTP-FRAME-MAIN"],
          metadata: {
            dimensions: "300x200x15mm",
            weight: "6.8kg",
            tolerance: "±0.05mm",
            material_spec: "EN 1.4301",
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1178"],
          part_number: "FK-BRACKET-B1",
          material: "Aluminium 7075-T6",
          notes: "Verstevigingsbeugel - Child of FK-BRACKET-A1",
          quantity: 32,
          status: "not_started" as const,
          parent_part_id: partIdLookup["FK-BRACKET-A1"],
          metadata: {
            dimensions: "80x60x4mm",
            weight: "0.12kg",
            tolerance: "±0.1mm",
            material_spec: "AMS-QQ-A-250/12",
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIdMap["WO-2025-1195"],
          part_number: "PH-MED-COVER",
          material: "RVS 316L",
          notes: "Deksel medische behuizing - Child of PH-MED-HOUSING",
          quantity: 6,
          status: "not_started" as const,
          parent_part_id: partIdLookup["PH-MED-HOUSING"],
          metadata: {
            dimensions: "360x290x3mm",
            weight: "2.1kg",
            material_spec: "EN 1.4404",
            surface_finish: "Ra < 0.8μm",
          },
        },
      ];

      logger.debug('MockData', 'Inserting child parts with parent links...');
      const { data: childPartsData, error: childError } = await supabase
        .from("parts")
        .insert(childParts)
        .select("id, part_number, job_id, parent_part_id");

      if (childError) {
        logger.error('MockData', 'Child parts error:', childError);
        throw childError;
      }

      logger.debug('MockData', `Created ${childPartsData?.length || 0} child parts`);

      partData =[...(parentPartsData || []), ...(childPartsData || [])];
      partIds = partData.map((p) => p.id);

      logger.debug('MockData', `Total parts created: ${partData.length} (${parentPartsData?.length} parents + ${childPartsData?.length} children)`);
    }

    reportProgress(7, 'operations');
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
      const operations: Record<string, unknown>[] = [];

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
          metadata?: Record<string, unknown>;
        }>,
      ) => {
        routing.forEach((op) => {
          operations.push({
            tenant_id: tenantId,
            part_id: partId,
            cell_id: cellIdMap[op.cell],
            operation_name: op.operation_name,
            notes: op.description, // Map description to notes field
            sequence: op.seq,
            status: op.status,
            estimated_time: Math.round(op.estimated_hours * 60), // Convert hours to minutes
            metadata: op.metadata || {},
          });
        });
      };

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
              status: "not_started",
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
              status: "not_started",
              metadata: {
                roughness_test: "Ra measurement",
                particle_test: "ISO 14644",
                material_cert: "EN 10204 3.1",
              },
            },
          ],
        );
      }

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
              status: "not_started",
            },
            {
              cell: "Afwerking",
              seq: 40,
              operation_name: "Elektropolish",
              description: "Elektrochemisch polijsten",
              estimated_hours: 0.5,
              status: "not_started",
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 50,
              operation_name: "Cleanroom inspectie",
              description: "Dimensie + oppervlakte controle",
              estimated_hours: 0.3,
              status: "not_started",
            },
          ],
        );
      }

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
              status: "not_started",
              metadata: { bend_count: 4, tooling: "V20-Alu" },
            },
            {
              cell: "Montage",
              seq: 30,
              operation_name: "Montage inserts",
              description: "Monteren draadinserts M6 voor bevestiging",
              estimated_hours: 0.3,
              status: "not_started",
              metadata: { insert_type: "Helicoil M6", quantity: 8 },
            },
            {
              cell: "Afwerking",
              seq: 40,
              operation_name: "Anodiseren",
              description: "Anodiseren naturel helder 15μm",
              estimated_hours: 0.4,
              status: "not_started",
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
              status: "not_started",
            },
          ],
        );
      }

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
              status: "not_started",
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Kanten",
              description: "Kanten montageranden",
              estimated_hours: 0.6,
              status: "not_started",
            },
            {
              cell: "Afwerking",
              seq: 30,
              operation_name: "Anodiseren",
              description: "Anodiseren naturel",
              estimated_hours: 0.6,
              status: "not_started",
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 40,
              operation_name: "Controle",
              description: "Steekproef dimensies",
              estimated_hours: 0.15,
              status: "not_started",
            },
          ],
        );
      }

      const asmlFrame = partData.find(
        (p) => p.part_number === "HTP-FRAME-MAIN",
      );
      if (asmlFrame) {
        createOperationRouting(
          asmlFrame.id,
          "HTP-FRAME-MAIN",
          "WO-2025-1156",
          "RVS 304",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Precisie lasersnijden",
              description: "Fiber laser snijden RVS304 - high precision mode",
              estimated_hours: 1.2,
              status: "not_started",
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
              status: "not_started",
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
              status: "not_started",
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
              status: "not_started",
              metadata: {
                cleanroom_assembly: true,
                torque_spec: "Per HTP drawing",
              },
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 50,
              operation_name: "CMM inspectie",
              description:
                "Volledige CMM meting + materiaalcertificaat + inspectie rapport",
              estimated_hours: 1.5,
              status: "not_started",
              metadata: {
                cmm_program: "HTP-FRAME-MAIN-CMM.prg",
                material_cert: "EN 10204 3.1 required",
                flatness_tolerance: "<0.02mm",
                inspection_report: "Full dimensional report + weld inspection",
              },
            },
          ],
        );
      }

      const asmlMount = partData.find(
        (p) => p.part_number === "HTP-MOUNT-PLT",
      );
      if (asmlMount) {
        createOperationRouting(
          asmlMount.id,
          "HTP-MOUNT-PLT",
          "WO-2025-1156",
          "RVS 304",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Lasersnijden",
              description: "Snijden montageplaten 15mm RVS",
              estimated_hours: 0.8,
              status: "not_started",
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Kanten",
              description: "Kanten bevestigingsranden",
              estimated_hours: 0.6,
              status: "not_started",
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 30,
              operation_name: "CMM controle",
              description: "CMM meting kritische maten",
              estimated_hours: 0.8,
              status: "not_started",
              metadata: { cmm_required: true, tolerance: "±0.05mm" },
            },
          ],
        );
      }

      const fkBracketA1 = partData.find(
        (p) => p.part_number === "FK-BRACKET-A1",
      );
      if (fkBracketA1) {
        createOperationRouting(
          fkBracketA1.id,
          "FK-BRACKET-A1",
          "WO-2025-1178",
          "Aluminium 7075-T6",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "CNC frezen contouren",
              description: "CNC frezen uit 7075-T6 plaat - AS9100 traceability",
              estimated_hours: 1.5,
              status: "completed",
              metadata: {
                material_cert: "AMS-QQ-A-250/12",
                lot_traceability: true,
              },
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Kanten aerospace",
              description: "Precisie kanten met special tooling voor 7075",
              estimated_hours: 1.0,
              status: "in_progress",
              metadata: {
                tooling: "Aerospace-spec V-die",
                spring_back_compensation: true,
              },
            },
            {
              cell: "Afwerking",
              seq: 30,
              operation_name: "Anodiseren Type II",
              description: "Chromaatzuur anodiseren per MIL-A-8625",
              estimated_hours: 0.8,
              status: "not_started",
              metadata: {
                spec: "MIL-A-8625 Type II",
                color: "Clear",
              },
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 40,
              operation_name: "FAI inspectie",
              description: "First Article Inspection + AS9102 documentatie",
              estimated_hours: 1.2,
              status: "not_started",
              metadata: {
                inspection_type: "FAI",
                documentation: "AS9102 FAIR",
                cert_required: true,
              },
            },
          ],
        );
      }

      const fkBracketB1 = partData.find(
        (p) => p.part_number === "FK-BRACKET-B1",
      );
      if (fkBracketB1) {
        createOperationRouting(
          fkBracketB1.id,
          "FK-BRACKET-B1",
          "WO-2025-1178",
          "Aluminium 7075-T6",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Lasersnijden",
              description: "Snijden verstevigingsbeugels",
              estimated_hours: 0.6,
              status: "not_started",
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Kanten",
              description: "Kanten montageranden",
              estimated_hours: 0.4,
              status: "not_started",
            },
            {
              cell: "Afwerking",
              seq: 30,
              operation_name: "Anodiseren",
              description: "Anodiseren matching main bracket",
              estimated_hours: 0.5,
              status: "not_started",
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 40,
              operation_name: "Inspectie",
              description: "Dimensie controle + traceability",
              estimated_hours: 0.3,
              status: "not_started",
            },
          ],
        );
      }

      const phMedHousing = partData.find(
        (p) => p.part_number === "PH-MED-HOUSING",
      );
      if (phMedHousing) {
        createOperationRouting(
          phMedHousing.id,
          "PH-MED-HOUSING",
          "WO-2025-1195",
          "RVS 316L",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Lasersnijden medisch",
              description: "Fiber laser snijden 316L - cleanroom prep",
              estimated_hours: 1.2,
              status: "not_started",
              metadata: {
                cleanroom_prep: true,
                nitrogen_cutting: true,
              },
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Precisie kanten",
              description: "Kanten met medische tooling",
              estimated_hours: 1.0,
              status: "not_started",
              metadata: {
                tooling: "Medical-grade",
                contamination_control: true,
              },
            },
            {
              cell: "Lassen",
              seq: 30,
              operation_name: "TIG lassen medisch",
              description: "TIG lassen - medical grade - purge welding",
              estimated_hours: 2.0,
              status: "not_started",
              metadata: {
                weld_type: "TIG orbital",
                purge_welding: true,
                argon_backing: true,
              },
            },
            {
              cell: "Afwerking",
              seq: 40,
              operation_name: "Elektropolish medisch",
              description: "Elektrochemisch polijsten Ra < 0.8μm",
              estimated_hours: 0.8,
              status: "not_started",
              metadata: {
                target_roughness: "Ra < 0.8μm",
                passivation: "Citric acid",
              },
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 50,
              operation_name: "Medische inspectie",
              description: "Full inspection + EN ISO 13485 documentatie",
              estimated_hours: 1.5,
              status: "not_started",
              metadata: {
                standard: "EN ISO 13485",
                biocompatibility_docs: true,
                material_certs: "EN 10204 3.1",
              },
            },
          ],
        );
      }

      const phMedCover = partData.find(
        (p) => p.part_number === "PH-MED-COVER",
      );
      if (phMedCover) {
        createOperationRouting(
          phMedCover.id,
          "PH-MED-COVER",
          "WO-2025-1195",
          "RVS 316L",
          [
            {
              cell: "Lasersnijden",
              seq: 10,
              operation_name: "Lasersnijden",
              description: "Snijden deksel medische behuizing",
              estimated_hours: 0.6,
              status: "not_started",
            },
            {
              cell: "CNC Kantbank",
              seq: 20,
              operation_name: "Kanten",
              description: "Kanten randen voor sluiting",
              estimated_hours: 0.5,
              status: "not_started",
            },
            {
              cell: "Afwerking",
              seq: 30,
              operation_name: "Elektropolish",
              description: "Elektrochemisch polijsten",
              estimated_hours: 0.5,
              status: "not_started",
            },
            {
              cell: "Kwaliteitscontrole",
              seq: 40,
              operation_name: "Inspectie",
              description: "Dimensie + oppervlakte controle",
              estimated_hours: 0.4,
              status: "not_started",
            },
          ],
        );
      }

      logger.debug('MockData', `Prepared ${operations.length} operations to insert...`);
      
      if (operations.length === 0) {
        logger.warn('MockData', 'No operations created - check if parts were found');
        logger.debug('MockData', 'Available parts:', partData.map(p => p.part_number));
        logger.debug('MockData', 'Available cells:', Object.keys(cellIdMap));
      } else {
        const { data: operationsInserted, error: operationsError } =
          await supabase
            .from("operations")
            .insert(operations as never[])
            .select("id, cell_id, part_id, status");

        if (operationsError) {
          logger.error('MockData', 'Operations insert error:', operationsError);
          throw operationsError;
        }

        operationData = operationsInserted || [];
        logger.debug(
          'MockData',
          `Created ${operationsInserted?.length || 0} QRM-aligned operations with detailed routing`,
        );
      }
    }

    // Keep substeps minimal - users can add more via templates or manually
    if (operationData.length > 0) {
      const inProgressOps = operationData.filter(op => op.status === "in_progress").slice(0, 2);

      if (inProgressOps.length > 0) {
        const substeps: Array<{
          tenant_id: string;
          operation_id: string;
          name: string;
          sequence: number;
          status: string;
          notes?: string;
        }> = [];

        for (const op of inProgressOps) {
          const simpleSteps = [
            { name: "Review drawing and specs", status: "completed" },
            { name: "Prepare materials", status: "completed" },
            { name: "Execute operation", status: "in_progress" },
            { name: "Quality check", status: "not_started" },
            { name: "Sign off", status: "not_started" },
          ];

          simpleSteps.forEach((step, idx) => {
            substeps.push({
              tenant_id: tenantId,
              operation_id: op.id,
              name: step.name,
              sequence: (idx + 1) * 10,
              status: step.status,
            });
          });
        }

        if (substeps.length > 0) {
          const { error: substepsError } = await supabase
            .from("substeps")
            .insert(substeps);

          if (substepsError) {
            logger.warn('MockData', 'Substeps creation warning:', substepsError);
          } else {
            logger.debug('MockData', `Created ${substeps.length} example substeps for ${inProgressOps.length} operations`);
          }
        }
      }
    }

    const templateDefinitions = [
      {
        name: "Cutting",
        description: "Standard cutting operation checklist",
        operation_type: "cutting",
        items: [
          { name: "Review cutting plan", notes: "Check dimensions" },
          { name: "Prepare material", notes: "Verify quantity and grade" },
          { name: "First article check", notes: "Measure first piece" },
          { name: "Execute cutting", notes: null },
          { name: "Deburr and inspect", notes: "Remove sharp edges" },
        ],
      },
      {
        name: "Bending",
        description: "Press brake bending checklist",
        operation_type: "bending",
        items: [
          { name: "Select tooling", notes: "Check dies and punches" },
          { name: "Set parameters", notes: "Tonnage, back gauge, angle" },
          { name: "Test bend", notes: "Verify on scrap material" },
          { name: "Execute bending", notes: null },
          { name: "Inspect angles", notes: "Use protractor" },
        ],
      },
      {
        name: "Welding",
        description: "Welding operation checklist",
        operation_type: "welding",
        items: [
          { name: "Check equipment", notes: "Gas, wire, settings" },
          { name: "Prepare joint", notes: "Clean and fit-up" },
          { name: "Tack weld", notes: "Verify alignment" },
          { name: "Execute welding", notes: null },
          { name: "Visual inspection", notes: "Check for defects" },
        ],
      },
      {
        name: "Assembly",
        description: "Assembly operation checklist",
        operation_type: "assembly",
        items: [
          { name: "Verify components", notes: "Check all parts present" },
          { name: "Review BOM", notes: "Confirm hardware" },
          { name: "Fit and align", notes: null },
          { name: "Fasten per spec", notes: "Use torque wrench if required" },
          { name: "Function test", notes: null },
        ],
      },
      {
        name: "Quality Check",
        description: "Final inspection checklist",
        operation_type: "inspection",
        items: [
          { name: "Gather documents", notes: "Drawings, specs" },
          { name: "Visual inspection", notes: null },
          { name: "Measure dimensions", notes: "Critical features" },
          { name: "Document results", notes: null },
          { name: "Sign off", notes: null },
        ],
      },
    ];

    for (const templateDef of templateDefinitions) {
      try {
        const { data: template, error: templateError } = await supabase
          .from("substep_templates")
          .insert({
            tenant_id: tenantId,
            name: templateDef.name,
            description: templateDef.description,
            operation_type: templateDef.operation_type,
            is_global: false,
          })
          .select("id")
          .single();

        if (templateError) {
          logger.warn('MockData', `Template "${templateDef.name}" warning:`, templateError);
          continue;
        }

        const items = templateDef.items.map((item, idx) => ({
          template_id: template.id,
          name: item.name,
          notes: item.notes,
          sequence: (idx + 1) * 10,
        }));

        const { error: itemsError } = await supabase
          .from("substep_template_items")
          .insert(items);

        if (itemsError) {
          logger.warn('MockData', `Template items for "${templateDef.name}" warning:`, itemsError);
        }
      } catch (err) {
        logger.warn('MockData', `Template "${templateDef.name}" error:`, err);
      }
    }
    logger.debug('MockData', `Created ${templateDefinitions.length} substep templates`);

    reportProgress(8, 'resourceLinks');
    if (
      options.includeResources &&
      operationData.length > 0 &&
      resourceData &&
      resourceData.length > 0
    ) {
      const operationResources = [];

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
          logger.warn('MockData', 'Resource linking warning:', linkError);
        } else {
          logger.debug(
            'MockData',
            `Linked ${operationResources.length} resources to operations`,
          );
        }
      }
    }

    reportProgress(9, 'timeEntries');
    if (
      options.includeTimeEntries &&
      operationData.length > 0 &&
      operatorIds.length > 0
    ) {
      const timeEntries = [];

      const workableOps = operationData.filter(
        (op) => op.status === "completed" || op.status === "in_progress",
      );

      for (const op of workableOps) {
        const numOperators = Math.random() > 0.7 ? 2 : 1;
        const selectedOperators = operatorIds
          .sort(() => Math.random() - 0.5)
          .slice(0, numOperators);

        for (const operatorId of selectedOperators) {
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
          logger.warn('MockData', 'Time entries warning:', timeError);
        } else {
          logger.debug(
            'MockData',
            `Created ${timeEntries.length} time entries for operators`,
          );
        }
      }
    }

    reportProgress(10, 'quantities');
    if (
      options.includeQuantityRecords &&
      operationData.length > 0 &&
      scrapReasonData &&
      scrapReasonData.length > 0
    ) {
      const quantityRecords = [];

      const completedOps = operationData.filter(
        (op) => op.status === "completed",
      );

      for (const op of completedOps) {
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
          logger.warn('MockData', 'Quantity records warning:', qtyError);
        } else {
          logger.debug(
            'MockData',
            `Created ${quantityRecords.length} quantity records with scrap tracking`,
          );
        }
      }
    }

    reportProgress(11, 'issues');
    if (
      options.includeIssues &&
      operationData.length > 0 &&
      operatorIds.length > 0
    ) {
      const issues: Record<string, unknown>[] = [];

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
          resolution: null as string | null,
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
          resolution: null as string | null,
          status: "in_review" as const,
        },
      ];

      selectedOps.forEach((op, idx) => {
        const template = issueTemplates[idx % issueTemplates.length];
        const createdDate = new Date("2025-11-01T00:00:00Z");
        createdDate.setDate(
          createdDate.getDate() + Math.floor(Math.random() * 25),
        );

        const issue: {
          tenant_id: string;
          operation_id: string;
          created_by: string;
          severity: string;
          description: string;
          status: string;
          created_at: string;
          resolution_notes?: string;
          reviewed_at?: string;
          reviewed_by?: string;
        } = {
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
          .insert(issues as never[]);

        if (issuesError) {
          logger.warn('MockData', 'Issues creation warning:', issuesError);
        } else {
          logger.debug('MockData', `Created ${issues.length} quality issues (NCRs)`);
        }
      }
    }

    const { error: demoModeError } = await supabase.rpc("enable_demo_mode", {
      p_tenant_id: tenantId,
      p_user_id: null, // Could be passed from context if available
    });

    if (demoModeError) {
      logger.warn('MockData', 'Could not set demo mode flag:', demoModeError);
      // Continue anyway - data is created successfully
    } else {
      logger.debug('MockData', 'Demo mode flag enabled for tenant');
    }

    logger.debug('MockData', 'Mock data generation completed successfully!');
    return { success: true };
  } catch (error) {
    logger.error('MockData', 'Error generating mock data:', error);
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
 *
 * @param tenantId - The UUID of the tenant to clear data for
 * @param useDatabaseFunction - If true, uses the database function clear_demo_data() (recommended)
 */
export async function clearMockData(
  tenantId: string,
  useDatabaseFunction: boolean = true,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!tenantId) {
      throw new Error("tenant_id is required for clearMockData");
    }

    logger.debug('MockData', `Clearing all mock data for tenant: ${tenantId}...`);

    // CRITICAL: Delete in reverse order of dependencies
    // All deletions MUST include tenant_id filter to prevent cross-tenant contamination

    const { error: notifErr } = await supabase
      .from("notifications")
      .delete()
      .eq("tenant_id", tenantId);
    if (notifErr) logger.warn('MockData', 'Notifications deletion warning:', notifErr);

    const { error: issuesErr } = await supabase
      .from("issues")
      .delete()
      .eq("tenant_id", tenantId);
    if (issuesErr) logger.warn('MockData', 'Issues deletion warning:', issuesErr);

    const { error: qtyErr } = await supabase
      .from("operation_quantities")
      .delete()
      .eq("tenant_id", tenantId);
    if (qtyErr) logger.warn('MockData', 'Quantity records deletion warning:', qtyErr);

    // time_entry_pauses has no tenant_id - must filter through time_entries
    const { data: tenantTimeEntries, error: teFetchErr } = await supabase
      .from("time_entries")
      .select("id")
      .eq("tenant_id", tenantId);

    if (teFetchErr) {
      logger.warn('MockData', 'Time entries fetch warning:', teFetchErr);
    } else if (tenantTimeEntries && tenantTimeEntries.length > 0) {
      const timeEntryIds = tenantTimeEntries.map((te) => te.id);
      const { error: tepErr } = await supabase
        .from("time_entry_pauses")
        .delete()
        .in("time_entry_id", timeEntryIds);
      if (tepErr) logger.warn('MockData', 'Time entry pauses deletion warning:', tepErr);
    }

    const { error: timeErr } = await supabase
      .from("time_entries")
      .delete()
      .eq("tenant_id", tenantId);
    if (timeErr) logger.warn('MockData', 'Time entries deletion warning:', timeErr);

    const { error: assignErr } = await supabase
      .from("assignments")
      .delete()
      .eq("tenant_id", tenantId);
    if (assignErr) logger.warn('MockData', 'Assignments deletion warning:', assignErr);

    const { error: substepsErr } = await supabase
      .from("substeps")
      .delete()
      .eq("tenant_id", tenantId);
    if (substepsErr) logger.warn('MockData', 'Substeps deletion warning:', substepsErr);

    // Must delete template items before templates due to FK constraint
    const { data: tenantTemplates, error: templateFetchErr } = await supabase
      .from("substep_templates")
      .select("id")
      .eq("tenant_id", tenantId);

    if (templateFetchErr) {
      logger.warn('MockData', 'Template fetch warning:', templateFetchErr);
    } else if (tenantTemplates && tenantTemplates.length > 0) {
      const templateIds = tenantTemplates.map((t) => t.id);
      const { error: templateItemsErr } = await supabase
        .from("substep_template_items")
        .delete()
        .in("template_id", templateIds);
      if (templateItemsErr)
        logger.warn('MockData', 'Template items deletion warning:', templateItemsErr);
    }

    const { error: templatesErr } = await supabase
      .from("substep_templates")
      .delete()
      .eq("tenant_id", tenantId);
    if (templatesErr) logger.warn('MockData', 'Templates deletion warning:', templatesErr);

    // CRITICAL: operation_resources has no tenant_id - must filter through operations for tenant isolation
    const { data: tenantOperations, error: opFetchErr } = await supabase
      .from("operations")
      .select("id")
      .eq("tenant_id", tenantId);

    if (opFetchErr) {
      logger.warn('MockData', 'Operation fetch warning:', opFetchErr);
    } else if (tenantOperations && tenantOperations.length > 0) {
      const operationIds = tenantOperations.map((op) => op.id);
      const { error: opResErr } = await supabase
        .from("operation_resources")
        .delete()
        .in("operation_id", operationIds);
      if (opResErr)
        logger.warn('MockData', 'Operation resources deletion warning:', opResErr);
    }

    const { error: opsErr } = await supabase
      .from("operations")
      .delete()
      .eq("tenant_id", tenantId);
    if (opsErr) logger.warn('MockData', 'Operations deletion warning:', opsErr);

    const { error: partsErr } = await supabase
      .from("parts")
      .delete()
      .eq("tenant_id", tenantId);
    if (partsErr) logger.warn('MockData', 'Parts deletion warning:', partsErr);

    const { error: jobsErr } = await supabase
      .from("jobs")
      .delete()
      .eq("tenant_id", tenantId);
    if (jobsErr) logger.warn('MockData', 'Jobs deletion warning:', jobsErr);

    const { error: cellsErr } = await supabase
      .from("cells")
      .delete()
      .eq("tenant_id", tenantId);
    if (cellsErr) logger.warn('MockData', 'Cells deletion warning:', cellsErr);

    const { error: resourcesErr } = await supabase
      .from("resources")
      .delete()
      .eq("tenant_id", tenantId);
    if (resourcesErr) logger.warn('MockData', 'Resources deletion warning:', resourcesErr);

    const { error: materialsErr } = await supabase
      .from("materials")
      .delete()
      .eq("tenant_id", tenantId);
    if (materialsErr) logger.warn('MockData', 'Materials deletion warning:', materialsErr);

    const { error: scrapErr } = await supabase
      .from("scrap_reasons")
      .delete()
      .eq("tenant_id", tenantId);
    if (scrapErr) logger.warn('MockData', 'Scrap reasons deletion warning:', scrapErr);

    // CRITICAL: Email filter must match seed_demo_operators function to avoid deleting real operators
    const { error: profilesErr } = await supabase
      .from("profiles")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("role", "operator")
      .in("email", [
        "demo.operator1@example.com",
        "demo.operator2@example.com",
        "demo.operator3@example.com",
        "demo.operator4@example.com",
      ]);
    if (profilesErr)
      logger.warn('MockData', 'Demo operators deletion warning:', profilesErr);

    const { error: calendarErr } = await supabase
      .from("factory_calendar")
      .delete()
      .eq("tenant_id", tenantId);
    if (calendarErr) logger.warn('MockData', 'Calendar deletion warning:', calendarErr);

    const { error: demoModeError } = await supabase.rpc("disable_demo_mode", {
      p_tenant_id: tenantId,
    });

    if (demoModeError) {
      logger.warn('MockData', 'Could not clear demo mode flag:', demoModeError);
      // Continue anyway - data is deleted successfully
    } else {
      logger.debug('MockData', 'Demo mode flag disabled for tenant');
    }

    logger.debug('MockData', `Mock data cleared successfully for tenant: ${tenantId}`);
    return { success: true };
  } catch (error) {
    logger.error('MockData', 'Error clearing mock data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
