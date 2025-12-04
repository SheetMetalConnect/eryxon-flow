import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, startOfDay, endOfDay, format, startOfWeek, endOfWeek, subWeeks, eachDayOfInterval } from "date-fns";

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
        heatmap: { cellName: string; values: number[] }[];
        periodLabels: string[];
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
                .or(`updated_at.gte.${startDate},status.eq.in_progress,status.eq.not_started`);

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

            // Generate date range for trends
            const now = new Date();
            const startDateTrend = subDays(now, dateRange);
            const dateInterval = eachDayOfInterval({ start: startDateTrend, end: now });

            // Calculate sampling interval to get ~10-12 data points for trends
            const trendSampleInterval = Math.max(1, Math.floor(dateRange / 10));

            // Calculate number of periods for reliability (weeks for 30+ days, days for shorter)
            const numPeriods = Math.min(8, Math.max(4, Math.ceil(dateRange / 7)));

            // MCT & OTP with trends
            const completedJobs = jobs?.filter(j => j.status === 'completed' && j.updated_at) || [];
            const mctValues = completedJobs.map(j => {
                const start = new Date(j.created_at!).getTime();
                const end = new Date(j.updated_at!).getTime();
                return (end - start) / (1000 * 60 * 60 * 24); // Days
            });
            const avgMct = mctValues.length ? mctValues.reduce((a, b) => a + b, 0) / mctValues.length : 0;

            const onTimeJobs = completedJobs.filter(j => j.due_date && new Date(j.updated_at!) <= new Date(j.due_date));
            const otp = completedJobs.length ? (onTimeJobs.length / completedJobs.length) * 100 : 100;

            // MCT trend - group by day
            const mctByDay = new Map<string, number[]>();
            completedJobs.forEach(j => {
                const day = format(new Date(j.updated_at!), 'yyyy-MM-dd');
                const mctDays = (new Date(j.updated_at!).getTime() - new Date(j.created_at!).getTime()) / (1000 * 60 * 60 * 24);
                if (!mctByDay.has(day)) mctByDay.set(day, []);
                mctByDay.get(day)!.push(mctDays);
            });

            const mctTrend = dateInterval.filter((_, i) => i % trendSampleInterval === 0).map(date => {
                const day = format(date, 'yyyy-MM-dd');
                const dayMcts = mctByDay.get(day) || [];
                const avgDayMct = dayMcts.length ? dayMcts.reduce((a, b) => a + b, 0) / dayMcts.length : avgMct;
                return { date: format(date, 'MMM d'), value: Number(avgDayMct.toFixed(1)) };
            });

            // OTP trend - calculate daily OTP
            const otpByDay = new Map<string, { onTime: number; total: number }>();
            completedJobs.forEach(j => {
                const day = format(new Date(j.updated_at!), 'yyyy-MM-dd');
                if (!otpByDay.has(day)) otpByDay.set(day, { onTime: 0, total: 0 });
                const dayData = otpByDay.get(day)!;
                dayData.total++;
                if (j.due_date && new Date(j.updated_at!) <= new Date(j.due_date)) {
                    dayData.onTime++;
                }
            });

            const otpTrend = dateInterval.filter((_, i) => i % trendSampleInterval === 0).map(date => {
                const day = format(date, 'yyyy-MM-dd');
                const dayData = otpByDay.get(day);
                const dayOtp = dayData && dayData.total > 0 ? (dayData.onTime / dayData.total) * 100 : otp;
                return { date: format(date, 'MMM d'), value: Number(dayOtp.toFixed(1)) };
            });

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
            const activeJobs = jobs?.filter(j => j.status === 'in_progress' || j.status === 'not_started') || [];
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

            // Throughput by cell with real daily trends
            const completedOps = operations?.filter(o => o.status === 'completed' && o.completed_at) || [];
            const throughputByCellDay = new Map<string, Map<string, number>>();

            completedOps.forEach(op => {
                if (op.cells?.name && op.completed_at) {
                    const cell = op.cells.name;
                    const day = format(new Date(op.completed_at), 'yyyy-MM-dd');

                    if (!throughputByCellDay.has(cell)) {
                        throughputByCellDay.set(cell, new Map());
                    }
                    const cellMap = throughputByCellDay.get(cell)!;
                    cellMap.set(day, (cellMap.get(day) || 0) + 1);
                }
            });

            // Generate trend days based on dateRange (use ~14 points for sparklines)
            const sparklineDays = Math.min(dateRange, 14);
            const trendDays = eachDayOfInterval({ start: subDays(now, sparklineDays - 1), end: now });

            const throughputByCell = Array.from(throughputByCellDay.entries()).map(([name, dayMap]) => {
                const trend = trendDays.map(date => {
                    const day = format(date, 'yyyy-MM-dd');
                    return dayMap.get(day) || 0;
                });
                const totalOps = trend.reduce((a, b) => a + b, 0);
                const daysWithData = trend.filter(v => v > 0).length || 1;
                return {
                    cellName: name,
                    current: Math.round(totalOps / daysWithData),
                    trend
                };
            }).sort((a, b) => b.current - a.current);

            // Reliability Heatmap - calculate OTP per cell per period (dynamic based on dateRange)
            // Generate period boundaries based on numPeriods
            const periodDays = Math.floor(dateRange / numPeriods);
            const periodStarts: Date[] = [];
            const periodLabels: string[] = [];

            for (let i = numPeriods - 1; i >= 0; i--) {
                const periodStart = subDays(now, i * periodDays + periodDays);
                const periodEnd = subDays(now, i * periodDays);
                periodStarts.push(periodStart);
                periodLabels.push(`${format(periodStart, 'MMM d')}-${format(periodEnd, 'd')}`);
            }

            // Group operations by cell and period, calculate reliability
            const reliabilityByCell = new Map<string, { onTime: number; total: number }[]>();

            completedOps.forEach(op => {
                if (!op.cells?.name || !op.completed_at) return;

                const cellName = op.cells.name;
                const completedDate = new Date(op.completed_at);

                // Initialize cell if needed
                if (!reliabilityByCell.has(cellName)) {
                    reliabilityByCell.set(cellName, Array.from({ length: numPeriods }, () => ({ onTime: 0, total: 0 })));
                }

                const cellData = reliabilityByCell.get(cellName)!;

                // Determine which period this operation belongs to
                for (let p = 0; p < numPeriods; p++) {
                    const periodStart = periodStarts[p];
                    const periodEnd = p < numPeriods - 1 ? periodStarts[p + 1] : now;

                    if (completedDate >= periodStart && completedDate < periodEnd) {
                        cellData[p].total++;
                        // On-time if completed before or on planned_end, or if no planned_end (assume on-time)
                        if (!op.planned_end || completedDate <= new Date(op.planned_end)) {
                            cellData[p].onTime++;
                        }
                        break;
                    }
                }
            });

            // Convert to percentage-based heatmap with dynamic values array
            const reliabilityHeatmap = Array.from(reliabilityByCell.entries())
                .map(([cellName, periods]) => ({
                    cellName,
                    values: periods.map(p => p.total > 0 ? Math.round((p.onTime / p.total) * 100) : 100)
                }))
                .sort((a, b) => a.cellName.localeCompare(b.cellName))
                .slice(0, 8); // Limit to 8 cells


            // Calculate MCT target from historical 75th percentile (achievable stretch goal)
            const sortedMcts = [...mctValues].sort((a, b) => a - b);
            const mctTarget = sortedMcts.length > 0
                ? sortedMcts[Math.floor(sortedMcts.length * 0.25)] // 25th percentile = faster than 75% of historical jobs
                : avgMct * 0.8; // Fallback: 20% better than current average

            return {
                mct: {
                    current: avgMct,
                    trend: mctTrend,
                    target: Number(mctTarget.toFixed(1)),
                },
                otp: {
                    current: otp,
                    trend: otpTrend,
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
                    periodLabels,
                },
            };
        },
        enabled: !!profile?.tenant_id,
        staleTime: 60000, // 1 minute
    });
}
