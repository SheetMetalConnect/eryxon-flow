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
}

export function useQRMDashboardMetrics(dateRange: number = 30) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ["qrm-dashboard-metrics", profile?.tenant_id, dateRange],
        queryFn: async (): Promise<QRMDashboardMetrics> => {
            if (!profile?.tenant_id) {
                throw new Error("No tenant ID");
            }

            // In a real implementation, we would fetch data from Supabase tables like:
            // - jobs (for MCT, OTP)
            // - operations (for Cycle Time, Throughput)
            // - operation_history (for Queue Time, WIP Age)
            // - issues (for Issue Rate)

            // For now, we will simulate the data structure as if it came from these tables,
            // but using mock data generation logic to ensure the dashboard looks realistic.
            // This allows us to build the UI components against the correct interface.

            const today = new Date();
            const trendDays = 30;

            // 1. MCT Mock Data
            const mctTrend = Array.from({ length: trendDays }).map((_, i) => ({
                date: format(subDays(today, trendDays - 1 - i), "MMM dd"),
                value: 12 + Math.random() * 5 - 2, // Avg around 12 days
            }));

            // 2. OTP Mock Data
            const otpTrend = Array.from({ length: 12 }).map((_, i) => ({
                date: format(subDays(today, (11 - i) * 7), "MMM dd"), // Weekly
                value: 85 + Math.random() * 15, // 85-100%
            }));

            // 3. Queue Time Mock Data
            const queueTimeByCell = [
                { cellName: "Laser Cutting", avgQueueTime: 4.2 },
                { cellName: "Bending", avgQueueTime: 12.5 },
                { cellName: "Welding", avgQueueTime: 8.1 },
                { cellName: "Assembly", avgQueueTime: 2.4 },
                { cellName: "Painting", avgQueueTime: 18.3 },
                { cellName: "Quality Control", avgQueueTime: 1.5 },
            ].sort((a, b) => b.avgQueueTime - a.avgQueueTime);

            // 4. Cycle Time Mock Data (Box Plot stats)
            const cycleTimeByOperation = [
                { operationType: "Laser", min: 2, q1: 5, median: 8, q3: 12, max: 18 },
                { operationType: "Bending", min: 5, q1: 10, median: 15, q3: 25, max: 45 },
                { operationType: "Welding", min: 10, q1: 20, median: 35, q3: 50, max: 90 },
                { operationType: "Assembly", min: 15, q1: 30, median: 45, q3: 60, max: 120 },
            ];

            // 5. WIP Age Mock Data
            const wipAgeDistribution = [
                { bucket: "0-2 days", count: 45, label: "0-2d" },
                { bucket: "3-5 days", count: 28, label: "3-5d" },
                { bucket: "6-10 days", count: 15, label: "6-10d" },
                { bucket: ">10 days", count: 8, label: ">10d" },
            ];

            // 6. Issue Rate Mock Data
            const issueRateByCategory = [
                { category: "Material", rate: 2.5, count: 12 },
                { category: "Machine", rate: 1.8, count: 8 },
                { category: "Quality", rate: 1.2, count: 5 },
                { category: "Documentation", rate: 0.8, count: 3 },
                { category: "Waiting", rate: 0.5, count: 2 },
            ];

            // 7. Throughput Mock Data
            const throughputByCell = [
                { cellName: "Laser", current: 145, trend: [120, 130, 140, 135, 145, 150, 145] },
                { cellName: "Bending", current: 85, trend: [80, 82, 85, 88, 85, 84, 85] },
                { cellName: "Welding", current: 42, trend: [40, 38, 42, 45, 42, 40, 42] },
                { cellName: "Assembly", current: 30, trend: [25, 28, 30, 32, 30, 28, 30] },
            ];

            return {
                mct: {
                    current: 12.4,
                    trend: mctTrend,
                    target: 10,
                },
                otp: {
                    current: 92.5,
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
                    totalWip: 96,
                },
                issueRate: {
                    byCategory: issueRateByCategory,
                    totalIssues: 30,
                },
                throughput: {
                    byCell: throughputByCell,
                },
            };
        },
        enabled: !!profile?.tenant_id,
        staleTime: 60000, // 1 minute
    });
}
