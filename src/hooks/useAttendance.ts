import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AttendanceEntry {
  id: string;
  tenant_id: string;
  operator_id: string | null;
  profile_id: string | null;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  status: "active" | "completed" | "auto_closed";
  shift_id: string | null;
  target_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  operator?: {
    id: string;
    full_name: string;
    employee_id: string;
  } | null;
  shift?: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  } | null;
}

export interface AttendanceStatus {
  is_clocked_in: boolean;
  clock_in_time: string | null;
  current_duration_minutes: number | null;
  target_hours: number | null;
  shift_name: string | null;
}

export function useAttendance(operatorId?: string | null) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Get current attendance status for an operator
  const statusQuery = useQuery({
    queryKey: ["attendance-status", operatorId],
    queryFn: async (): Promise<AttendanceStatus | null> => {
      if (!operatorId) return null;

      const { data, error } = await supabase.rpc(
        "get_operator_attendance_status" as any,
        { p_operator_id: operatorId }
      );

      if (error) throw error;

      const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
      return result;
    },
    enabled: !!operatorId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get attendance history for today
  const todayQuery = useQuery({
    queryKey: ["attendance-today", profile?.tenant_id],
    queryFn: async (): Promise<AttendanceEntry[]> => {
      if (!profile?.tenant_id) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("attendance_entries")
        .select(`
          *,
          operator:operators(id, full_name, employee_id),
          shift:factory_shifts(id, name, start_time, end_time)
        `)
        .eq("tenant_id", profile.tenant_id)
        .gte("clock_in", today.toISOString())
        .order("clock_in", { ascending: false });

      if (error) throw error;
      return (data as unknown as AttendanceEntry[]) || [];
    },
    enabled: !!profile?.tenant_id,
  });

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async ({
      operatorId,
      notes,
    }: {
      operatorId: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("operator_clock_in" as any, {
        p_operator_id: operatorId,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-status"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async ({
      operatorId,
      notes,
    }: {
      operatorId: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("operator_clock_out" as any, {
        p_operator_id: operatorId,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-status"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    },
  });

  return {
    status: statusQuery.data,
    isLoadingStatus: statusQuery.isLoading,
    todayAttendance: todayQuery.data || [],
    isLoadingToday: todayQuery.isLoading,
    clockIn: clockInMutation.mutateAsync,
    clockOut: clockOutMutation.mutateAsync,
    isClockingIn: clockInMutation.isPending,
    isClockingOut: clockOutMutation.isPending,
  };
}

// Hook to get all operators with their attendance status
export function useOperatorsWithAttendance() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["operators-attendance", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      // Get all active operators
      const { data: operators, error: opError } = await supabase
        .from("operators")
        .select("id, employee_id, full_name, active, last_login_at")
        .eq("tenant_id", profile.tenant_id)
        .eq("active", true)
        .order("full_name");

      if (opError) throw opError;

      // Get current attendance entries
      const { data: attendance, error: attError } = await supabase
        .from("attendance_entries")
        .select("operator_id, clock_in, status, target_hours, shift:factory_shifts(name)")
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "active");

      if (attError) throw attError;

      // Merge data
      const attendanceMap = new Map(
        (attendance || []).map((a: any) => [a.operator_id, a])
      );

      return (operators || []).map((op) => ({
        ...op,
        attendance: attendanceMap.get(op.id) || null,
        is_clocked_in: attendanceMap.has(op.id),
      }));
    },
    enabled: !!profile?.tenant_id,
    refetchInterval: 30000,
  });
}
