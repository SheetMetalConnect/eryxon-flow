import { supabase } from '@/integrations/supabase/client';

export interface MockDataOptions {
  includeCells?: boolean;
  includeJobs?: boolean;
  includeParts?: boolean;
  includeOperations?: boolean;
}

/**
 * Generates mock MES data for onboarding new users
 * Creates realistic metal fabrication shop data with cells, jobs, parts, and operations
 */
export async function generateMockData(
  tenantId: string,
  options: MockDataOptions = {
    includeCells: true,
    includeJobs: true,
    includeParts: true,
    includeOperations: true,
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Create manufacturing cells/stages
    let cellIds: string[] = [];
    if (options.includeCells) {
      const cells = [
        {
          tenant_id: tenantId,
          name: 'Laser Cutting',
          sequence: 0,
          description: 'High-precision laser cutting station',
          color: '#3b82f6', // blue
          active: true,
        },
        {
          tenant_id: tenantId,
          name: 'CNC Bending',
          sequence: 1,
          description: 'Press brake and folding operations',
          color: '#f59e0b', // amber
          active: true,
        },
        {
          tenant_id: tenantId,
          name: 'Welding',
          sequence: 2,
          description: 'MIG/TIG welding and fabrication',
          color: '#ef4444', // red
          active: true,
        },
        {
          tenant_id: tenantId,
          name: 'Assembly',
          sequence: 3,
          description: 'Final assembly and hardware installation',
          color: '#8b5cf6', // violet
          active: true,
        },
        {
          tenant_id: tenantId,
          name: 'Finishing',
          sequence: 4,
          description: 'Powder coating and surface treatment',
          color: '#10b981', // green
          active: true,
        },
        {
          tenant_id: tenantId,
          name: 'Quality Control',
          sequence: 5,
          description: 'Final inspection and quality assurance',
          color: '#6366f1', // indigo
          active: true,
        },
      ];

      const { data: cellData, error: cellError } = await supabase
        .from('cells')
        .insert(cells)
        .select('id');

      if (cellError) throw cellError;
      cellIds = cellData?.map((c) => c.id) || [];
    }

    // Step 2: Create sample jobs
    let jobIds: string[] = [];
    if (options.includeJobs) {
      const jobs = [
        {
          tenant_id: tenantId,
          job_number: 'JOB-2024-001',
          customer: 'Acme Manufacturing',
          notes: 'Custom stainless steel enclosures - Rush order - customer needs by end of week',
          status: 'in_progress' as const,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          metadata: {
            material: 'SS304',
            thickness: '2mm',
            quantity: 10,
            finish: 'Brushed',
          },
        },
        {
          tenant_id: tenantId,
          job_number: 'JOB-2024-002',
          customer: 'Industrial Solutions Inc',
          notes: 'Aluminum mounting brackets - Standard lead time',
          status: 'in_progress' as const,
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
          metadata: {
            material: 'AL6061',
            thickness: '3mm',
            quantity: 50,
            finish: 'Anodized',
          },
        },
        {
          tenant_id: tenantId,
          job_number: 'JOB-2024-003',
          customer: 'Tech Innovations LLC',
          notes: 'Steel server rack panels - Repeat order - use previous setup',
          status: 'not_started' as const,
          due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days
          metadata: {
            material: 'CRS',
            thickness: '1.5mm',
            quantity: 25,
            finish: 'Powder coat black',
          },
        },
      ];

      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert(jobs)
        .select('id');

      if (jobError) throw jobError;
      jobIds = jobData?.map((j) => j.id) || [];
    }

    // Step 3: Create parts for each job
    let partIds: string[] = [];
    if (options.includeParts && jobIds.length > 0) {
      const parts = [
        // Job 1 parts
        {
          tenant_id: tenantId,
          job_id: jobIds[0],
          part_number: 'ENC-TOP-001',
          material: 'SS304',
          notes: 'Enclosure Top Panel',
          quantity: 10,
          status: 'in_progress' as const,
          metadata: {
            dimensions: '400x300x2mm',
            weight: '2.1kg',
            bendCount: 2,
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIds[0],
          part_number: 'ENC-SIDE-001',
          material: 'SS304',
          notes: 'Enclosure Side Panel',
          quantity: 20,
          status: 'not_started' as const,
          metadata: {
            dimensions: '300x200x2mm',
            weight: '1.4kg',
            bendCount: 3,
          },
        },
        // Job 2 parts
        {
          tenant_id: tenantId,
          job_id: jobIds[1],
          part_number: 'BRK-MNT-A',
          material: 'AL6061',
          notes: 'L-Bracket Type A',
          quantity: 50,
          status: 'not_started' as const,
          metadata: {
            dimensions: '100x75x3mm',
            weight: '0.3kg',
            bendCount: 1,
          },
        },
        {
          tenant_id: tenantId,
          job_id: jobIds[1],
          part_number: 'BRK-MNT-B',
          material: 'AL6061',
          notes: 'L-Bracket Type B',
          quantity: 50,
          status: 'not_started' as const,
          metadata: {
            dimensions: '150x100x3mm',
            weight: '0.5kg',
            bendCount: 1,
          },
        },
        // Job 3 parts
        {
          tenant_id: tenantId,
          job_id: jobIds[2],
          part_number: 'SRV-PNL-001',
          material: 'CRS',
          notes: 'Server Rack Front Panel',
          quantity: 25,
          status: 'not_started' as const,
          metadata: {
            dimensions: '482x88x1.5mm',
            weight: '0.8kg',
            bendCount: 4,
          },
        },
      ];

      const { data: partData, error: partError } = await supabase
        .from('parts')
        .insert(parts)
        .select('id, part_number');

      if (partError) throw partError;
      partIds = partData?.map((p) => p.id) || [];

      // Step 4: Create operations for parts
      if (options.includeOperations && partIds.length > 0 && cellIds.length > 0) {
        const operations = [];

        // For each part, create a sequence of operations through the cells
        for (let i = 0; i < partIds.length; i++) {
          const partId = partIds[i];
          const isFirstPart = i === 0; // First part has some operations in progress

          // Laser cutting (always first)
          operations.push({
            tenant_id: tenantId,
            part_id: partId,
            cell_id: cellIds[0], // Laser Cutting
            operation_number: `OP-${String(i + 1).padStart(3, '0')}-010`,
            description: 'Laser cut profile',
            sequence: 10,
            status: isFirstPart ? 'completed' : 'queued',
            estimated_hours: 0.5,
            metadata: {
              program: 'LASER_CUT_001.nc',
              material: 'Sheet metal',
              setup: 'Standard nest',
            },
          });

          // Bending
          operations.push({
            tenant_id: tenantId,
            part_id: partId,
            cell_id: cellIds[1], // CNC Bending
            operation_number: `OP-${String(i + 1).padStart(3, '0')}-020`,
            description: 'Form bends per drawing',
            sequence: 20,
            status: isFirstPart ? 'in_progress' : 'queued',
            estimated_hours: 0.75,
            metadata: {
              tooling: 'Standard V-die',
              bendSequence: [1, 2, 3],
              bendAngles: [90, 90, 45],
            },
          });

          // Welding (for some parts)
          if (i < 2) {
            operations.push({
              tenant_id: tenantId,
              part_id: partId,
              cell_id: cellIds[2], // Welding
              operation_number: `OP-${String(i + 1).padStart(3, '0')}-030`,
              description: 'Weld seams per spec',
              sequence: 30,
              status: 'queued',
              estimated_hours: 1.0,
              metadata: {
                weldType: 'MIG',
                material: 'ER308L',
                inspectionRequired: true,
              },
            });
          }

          // Assembly (for first job only)
          if (i < 2) {
            operations.push({
              tenant_id: tenantId,
              part_id: partId,
              cell_id: cellIds[3], // Assembly
              operation_number: `OP-${String(i + 1).padStart(3, '0')}-040`,
              description: 'Install hardware and assemble',
              sequence: 40,
              status: 'queued',
              estimated_hours: 0.5,
              metadata: {
                hardware: ['M6 screws', 'Lock washers'],
                torque: '10 Nm',
              },
            });
          }

          // Finishing
          operations.push({
            tenant_id: tenantId,
            part_id: partId,
            cell_id: cellIds[4], // Finishing
            operation_number: `OP-${String(i + 1).padStart(3, '0')}-050`,
            description: 'Surface treatment',
            sequence: 50,
            status: 'queued',
            estimated_hours: 0.25,
            metadata: {
              finish: i < 3 ? 'Brushed' : 'Powder coat',
              color: 'Black RAL 9005',
            },
          });

          // Quality Control (always last)
          operations.push({
            tenant_id: tenantId,
            part_id: partId,
            cell_id: cellIds[5], // QC
            operation_number: `OP-${String(i + 1).padStart(3, '0')}-060`,
            description: 'Final inspection',
            sequence: 60,
            status: 'queued',
            estimated_hours: 0.25,
            metadata: {
              inspectionPoints: ['Dimensions', 'Surface finish', 'Bend angles'],
              requiresSignoff: true,
            },
          });
        }

        const { error: operationsError } = await supabase
          .from('operations')
          .insert(operations);

        if (operationsError) throw operationsError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error generating mock data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clears all mock data for a tenant
 * Useful for resetting during onboarding
 */
export async function clearMockData(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete in reverse order of dependencies
    await supabase.from('time_entries').delete().eq('tenant_id', tenantId);
    await supabase.from('operations').delete().eq('tenant_id', tenantId);
    await supabase.from('parts').delete().eq('tenant_id', tenantId);
    await supabase.from('jobs').delete().eq('tenant_id', tenantId);
    await supabase.from('cells').delete().eq('tenant_id', tenantId);

    return { success: true };
  } catch (error) {
    console.error('Error clearing mock data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
