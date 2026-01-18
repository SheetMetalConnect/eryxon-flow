import { supabase } from "@/integrations/supabase/client";
import { MockDataResult, GeneratorContext } from "./types";
import { getRelativeISO, getRandomRelativeDate } from "./utils";

export async function seedJobs(ctx: GeneratorContext): Promise<MockDataResult & { jobIds?: string[], jobIdMap?: Record<string, string> }> {
    try {
        if (!ctx.options.includeJobs) {
            return { success: true, jobIds: [], jobIdMap: {} };
        }

        const { now, tenantId } = ctx;
        const jobIdMap: Record<string, string> = {};

        // Define job templates with relative timings
        // Completed jobs: started ~3 months ago, finished ~1 month ago
        // In Progress jobs: started ~1 month ago, due ~1 month future
        // Not Started jobs: started recently, due ~2 months future

        const jobs = [
            {
                tenant_id: tenantId,
                job_number: "WO-2025-1047",
                customer: "Van den Berg Machinebouw B.V.",
                notes: "Hydraulische hefframe - Urgente levering voor offshore project",
                status: "completed" as const,
                due_date: getRelativeISO(now, -10, "17:00"), // Due 10 days ago
                created_at: getRelativeISO(now, -90, "09:00"), // Created 90 days ago
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
                due_date: getRelativeISO(now, 14, "12:00"), // Due in 2 weeks
                created_at: getRelativeISO(now, -30, "14:30"), // Created 1 month ago
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
                due_date: getRelativeISO(now, 21, "17:00"), // Due in 3 weeks
                created_at: getRelativeISO(now, -20, "08:15"),
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
                notes: "Precisie framewerk voor semiconductor equipment - Tolerantie ±0.05mm",
                status: "in_progress" as const,
                due_date: getRelativeISO(now, 45, "17:00"),
                created_at: getRelativeISO(now, -10, "10:45"),
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
                due_date: getRelativeISO(now, 60, "17:00"), // Due in 2 months
                created_at: getRelativeISO(now, -5, "11:00"),
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
                due_date: getRelativeISO(now, 90, "17:00"), // Due in 3 months
                created_at: getRelativeISO(now, -2, "09:30"),
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

        const jobIds = jobData?.map((j) => j.id) || [];
        jobData?.forEach((j, idx) => {
            jobIdMap[jobs[idx].job_number] = j.id;
        });

        console.log(`✓ Created ${jobIds.length} realistic Dutch customer jobs`);
        return { success: true, jobIds, jobIdMap };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
