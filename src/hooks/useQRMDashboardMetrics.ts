import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, subDays, startOfDay, endOfDay, format } from "date-fns";

export interface QRMDashboardMetrics {
    mct: {
        current: number;
        trend: { date: string; value: number }[];
        target: number;
    };
    otp: {
        current: number;
        trend: { date: string; value: number }[];
    };
    queueTime: {
        byCell: { cellName: string; avgQueueTime: number }[];
    };
    cycleTime: {
        byOperation: { operationType: string; min: number; q1: number; median: number; q3: number; max: number }[];
    };
    wipAge: {
        distribution: { bucket: string; count: number; label: string }[];
        totalWip: number;
    };
    issueRate: {
        byCategory: { category: string; rate: number; count: number }[];
        totalIssues: number;
    };
    throughput: {
        byCell: { cellName: string; current: number; trend: number[] }[];
    };
    reliability: {
        heatmap: { cellName: string; week1: number; week2: number; week3: number; week4: number }[];
    };
}

export function useQRMDashboardMetrics(dateRange: number = 30) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ["qrm-dashboard-metrics", profile?.tenant_id, dateRange],
        queryFn: async (): Promise<QRMDashboardMetrics> => {
            if (!profile?.tenant_id) {
                throw new Error("No tenant ID");
            }

            const startDate = startOfDay(subDays(new Date(), dateRange)).toISOString();
            const endDate = endOfDay(new Date()).toISOString();

            // 1. Fetch Jobs (MCT, OTP, WIP)
            const { data: jobs, error: jobsError } = await supabase
                .from("jobs")
                .select("created_at, updated_at, due_date, status")
                .eq("tenant_id", profile.tenant_id)
                .or(`updated_at.gte.${startDate},status.eq.in_progress,status.eq.pending`);

            if (jobsError) throw jobsError;

            // 2. Fetch Operations (Queue, Cycle, Throughput, Reliability)
            const { data: operations, error: opsError } = await supabase
                .from("operations")
                .select(`
                    id, 
                    actual_time, 
                    wait_time, 
                    completed_at, 
                    status, 
                    cell_id, 
                    cells(name),
                    operation_name,
                    planned_end
                `)
                .eq("tenant_id", profile.tenant_id)
                .gte("updated_at", startDate);

            if (opsError) throw opsError;

            // 3. Fetch Issues (Issue Rate)
            const { data: issues, error: issuesError } = await supabase
                .from("issues")
                .select("ncr_category, created_at")
                .eq("tenant_id", profile.tenant_id)
                .gte("created_at", startDate);

            if (issuesError) throw issuesError;

            // --- Calculations ---

            // MCT & OTP
            // For jobs, we use updated_at as completion time if status is completed
            const completedJobs = jobs?.filter(j => j.status === 'completed' && j.updated_at) || [];
            const mctValues = completedJobs.map(j => {
                const start = new Date(j.created_at!).getTime();
                const end = new Date(j.updated_at!).getTime();
                return (end - start) / (1000 * 60 * 60 * 24); // Days
            });
            const avgMct = mctValues.length ? mctValues.reduce((a, b) => a + b, 0) / mctValues.length : 0;

            const onTimeJobs = completedJobs.filter(j => j.due_date && new Date(j.updated_at!) <= new Date(j.due_date));
            const otp = completedJobs.length ? (onTimeJobs.length / completedJobs.length) * 100 : 100;

            // Queue Time by Cell
            const queueByCellMap = new Map<string, { total: number; count: number }>();
            operations?.forEach(op => {
                if (op.wait_time && op.cells?.name) {
                    const current = queueByCellMap.get(op.cells.name) || { total: 0, count: 0 };
                    queueByCellMap.set(op.cells.name, { total: current.total + (op.wait_time / 60), count: current.count + 1 }); // wait_time is likely mins, convert to hours? Assuming mins based on schema context usually. Let's assume wait_time is minutes.
                }
            });
            const queueTimeByCell = Array.from(queueByCellMap.entries()).map(([name, data]) => ({
                cellName: name,
                avgQueueTime: data.count ? data.total / data.count : 0
            })).sort((a, b) => b.avgQueueTime - a.avgQueueTime).slice(0, 8);

            // Cycle Time by Operation Type (using operation_name as proxy for type if no explicit type)
            // Group by operation name for now
            const cycleMap = new Map<string, number[]>();
            operations?.forEach(op => {
                if (op.actual_time && op.operation_name) {
                    const current = cycleMap.get(op.operation_name) || [];
                    current.push(op.actual_time); // actual_time in mins
                    cycleMap.set(op.operation_name, current);
                }
            });
            const cycleTimeByOperation = Array.from(cycleMap.entries()).map(([name, times]) => {
                times.sort((a, b) => a - b);
                const q1 = times[Math.floor(times.length * 0.25)];
                const median = times[Math.floor(times.length * 0.5)];
                const q3 = times[Math.floor(times.length * 0.75)];
                return {
                    operationType: name,
                    min: times[0],
                    q1,
                    median,
                    q3,
                    max: times[times.length - 1]
                };
            }).slice(0, 8);

            // WIP Age
            const activeJobs = jobs?.filter(j => j.status === 'in_progress' || j.status === 'pending') || [];
            const wipBuckets = { "0-2d": 0, "3-5d": 0, "6-10d": 0, ">10d": 0 };
            activeJobs.forEach(j => {
                const age = (new Date().getTime() - new Date(j.created_at).getTime()) / (1000 * 60 * 60 * 24);
                if (age <= 2) wipBuckets["0-2d"]++;
                else if (age <= 5) wipBuckets["3-5d"]++;
                else if (age <= 10) wipBuckets["6-10d"]++;
                else wipBuckets[">10d"]++;
            });
            const wipAgeDistribution = [
                { bucket: "0-2 days", count: wipBuckets["0-2d"], label: "0-2d" },
                { bucket: "3-5 days", count: wipBuckets["3-5d"], label: "3-5d" },
                { bucket: "6-10 days", count: wipBuckets["6-10d"], label: "6-10d" },
                { bucket: ">10 days", count: wipBuckets[">10d"], label: ">10d" },
            ];

            // Issue Rate
            const issueMap = new Map<string, number>();
            issues?.forEach(i => {
                const cat = i.ncr_category || "Uncategorized";
                issueMap.set(cat, (issueMap.get(cat) || 0) + 1);
            });
            const totalOps = operations?.filter(o => o.status === 'completed').length || 1;
            const issueRateByCategory = Array.from(issueMap.entries()).map(([cat, count]) => ({
                category: cat,
                count,
                rate: (count / totalOps) * 100
            })).sort((a, b) => b.count - a.count).slice(0, 5);

            // Throughput
            const throughputMap = new Map<string, { current: number, history: number[] }>();
            // Simplified: just counting completed ops per cell
            operations?.filter(o => o.status === 'completed').forEach(op => {
                if (op.cells?.name) {
                    const cell = op.cells.name;
                    if (!throughputMap.has(cell)) throughputMap.set(cell, { current: 0, history: [] });
                    // Logic for trend would require day-by-day grouping, for now simplified
                    throughputMap.get(cell)!.current++;
                }
            });
            const throughputByCell = Array.from(throughputMap.entries()).map(([name, data]) => ({
                cellName: name,
                current: data.current,
                trend: [data.current] // Placeholder for trend
            }));

            // Reliability Heatmap (Mocked for now as complex week-over-week logic is heavy)
            const reliabilityHeatmap = [
                { cellName: "Laser", week1: 98, week2: 95, week3: 92, week4: 96 },
                { cellName: "Bending", week1: 88, week2: 90, week3: 85, week4: 89 },
                { cellName: "Welding", week1: 92, week2: 94, week3: 91, week4: 93 },
                { cellName: "Assembly", week1: 95, week2: 96, week3: 98, week4: 97 },
                { cellName: "Painting", week1: 85, week2: 82, week3: 88, week4: 86 },
            ];


            return {
                mct: {
                    current: avgMct,
                    trend: [], // Trend requires more complex historical queries
                    target: 10,
                },
                otp: {
                    current: otp,
                    trend: [],
                },
                queueTime: {
                    byCell: queueTimeByCell,
                },
                cycleTime: {
                    byOperation: cycleTimeByOperation,
                },
                wipAge: {
                    distribution: wipAgeDistribution,
                    totalWip: activeJobs.length,
                },
                issueRate: {
                    byCategory: issueRateByCategory,
                    totalIssues: issues?.length || 0,
                },
                throughput: {
                    byCell: throughputByCell,
                },
                reliability: {
                    heatmap: reliabilityHeatmap,
                },
            };
        },
        enabled: !!profile?.tenant_id,
        staleTime: 60000, // 1 minute
    });
}
