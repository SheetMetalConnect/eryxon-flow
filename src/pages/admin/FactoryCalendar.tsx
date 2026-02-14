import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar as CalendarIcon,
  Trash2,
  Sun,
  Moon,
  Clock,
  Percent,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek
} from "date-fns";
import type { Database } from "@/integrations/supabase/types";

// Use database types for consistency
type FactoryCalendarRow = Database['public']['Tables']['factory_calendar']['Row'];
type TenantRow = Database['public']['Tables']['tenants']['Row'];

type DayType = 'working' | 'holiday' | 'closure' | 'half_day';

interface CalendarDay {
  id?: string;
  tenant_id?: string;
  date: string;
  day_type: DayType;
  name: string | null;
  opening_time: string | null;
  closing_time: string | null;
  capacity_multiplier: number | null;
  notes: string | null;
}

const DAY_TYPE_COLORS: Record<DayType, string> = {
  working: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  holiday: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  closure: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  half_day: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
};

const DAY_TYPE_ICONS: Record<DayType, React.ReactNode> = {
  working: <Sun className="h-3 w-3" />,
  holiday: <Moon className="h-3 w-3" />,
  closure: <Moon className="h-3 w-3" />,
  half_day: <Clock className="h-3 w-3" />,
};

export default function FactoryCalendar() {
  const { t } = useTranslation();
  const { profile, tenant } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CalendarDay>({
    date: '',
    day_type: 'holiday',
    name: '',
    opening_time: null,
    closing_time: null,
    capacity_multiplier: 0,
    notes: null,
  });

  // Working days mask from tenant (Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64)
  // Default 31 = Mon-Fri
  const workingDaysMask = (tenant as any)?.working_days_mask ?? 31;

  // Translation helpers for day types
  const getDayTypeLabel = (type: DayType): string => {
    const labels: Record<DayType, string> = {
      working: t("calendar.dayTypes.working", "Working Day"),
      holiday: t("calendar.dayTypes.holiday", "Holiday"),
      closure: t("calendar.dayTypes.closure", "Closure"),
      half_day: t("calendar.dayTypes.halfDay", "Half Day"),
    };
    return labels[type];
  };

  useEffect(() => {
    if (profile?.tenant_id) {
      loadCalendarDays();
    }
  }, [profile?.tenant_id, currentMonth]);

  const loadCalendarDays = async () => {
    if (!profile?.tenant_id) return;

    setLoading(true);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const { data, error } = await supabase
      .from("factory_calendar")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .gte("date", format(monthStart, 'yyyy-MM-dd'))
      .lte("date", format(monthEnd, 'yyyy-MM-dd'));

    if (error) {
      console.error("Error loading calendar:", error);
      toast.error(t("calendar.messages.loadFailed", "Failed to load calendar"));
    } else {
      setCalendarDays((data || []) as CalendarDay[]);
    }
    setLoading(false);
  };

  const isDefaultWorkingDay = (date: Date | null | undefined): boolean => {
    if (!date || isNaN(date.getTime())) return false;
    // JavaScript: 0=Sunday, 1=Monday, ..., 6=Saturday
    // Our mask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
    const jsDay = getDay(date);
    const maskBits = [64, 1, 2, 4, 8, 16, 32]; // Map JS day to our mask bits
    return (workingDaysMask & maskBits[jsDay]) !== 0;
  };

  const getCalendarDay = (date: Date | null | undefined): CalendarDay | null => {
    if (!date || isNaN(date.getTime())) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarDays.find(d => d.date === dateStr) || null;
  };

  const getDayType = (date: Date | null | undefined): string => {
    if (!date || isNaN(date.getTime())) return 'closure';
    const calDay = getCalendarDay(date);
    if (calDay) return calDay.day_type;
    return isDefaultWorkingDay(date) ? 'working' : 'closure';
  };

  const handleDateClick = (date: Date) => {
    const existing = getCalendarDay(date);
    setSelectedDate(date);

    if (existing) {
      setFormData({
        ...existing,
        date: existing.date,
      });
    } else {
      setFormData({
        date: format(date, 'yyyy-MM-dd'),
        day_type: isDefaultWorkingDay(date) ? 'holiday' : 'working',
        name: '',
        opening_time: null,
        closing_time: null,
        capacity_multiplier: isDefaultWorkingDay(date) ? 0 : 1,
        notes: null,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!profile?.tenant_id || !selectedDate) return;

    setSaving(true);
    const existing = getCalendarDay(selectedDate);

    try {
      if (existing?.id) {
        // Update existing
        const { error } = await supabase
          .from("factory_calendar")
          .update({
            day_type: formData.day_type,
            name: formData.name || null,
            opening_time: formData.opening_time || null,
            closing_time: formData.closing_time || null,
            capacity_multiplier: formData.capacity_multiplier,
            notes: formData.notes || null,
          })
          .eq("id", existing.id);

        if (error) throw error;
        toast.success(t("calendar.messages.updated", "Calendar updated"));
      } else {
        // Insert new
        const { error } = await supabase
          .from("factory_calendar")
          .insert({
            tenant_id: profile.tenant_id,
            date: formData.date,
            day_type: formData.day_type,
            name: formData.name || null,
            opening_time: formData.opening_time || null,
            closing_time: formData.closing_time || null,
            capacity_multiplier: formData.capacity_multiplier ?? 0,
            notes: formData.notes || null,
          });

        if (error) throw error;
        toast.success(t("calendar.messages.added", "Calendar entry added"));
      }

      setDialogOpen(false);
      loadCalendarDays();
    } catch (error: any) {
      console.error("Error saving calendar:", error);
      toast.error(error.message || t("calendar.messages.saveFailed", "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDate) return;

    const existing = getCalendarDay(selectedDate);
    if (!existing?.id) {
      setDialogOpen(false);
      setDeleteDialogOpen(false);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("factory_calendar")
        .delete()
        .eq("id", existing.id);

      if (error) throw error;
      toast.success(t("calendar.messages.deleted", "Calendar entry removed"));
      setDeleteDialogOpen(false);
      setDialogOpen(false);
      loadCalendarDays();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error(t("calendar.messages.deleteFailed", "Failed to delete"));
    } finally {
      setSaving(false);
    }
  };

  // Helper to get capacity multiplier with null handling
  const getCapacityMultiplier = (): number => {
    return formData.capacity_multiplier ?? 0;
  };

  // Get days for the calendar grid (including padding from prev/next months)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDates = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  if (loading && calendarDays.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            {t("calendar.title", "Factory Calendar")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("calendar.description", "Manage holidays, closures, and special working days")}
          </p>
        </div>
      </div>

      <hr className="title-divider" />

      {/* Legend */}
      <Card className="glass-card">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2">
              {t("calendar.legend", "Legend")}:
            </span>
            {(['working', 'holiday', 'closure', 'half_day'] as DayType[]).map((type) => (
              <Badge
                key={type}
                variant="outline"
                className={`${DAY_TYPE_COLORS[type]} border gap-1.5`}
              >
                {DAY_TYPE_ICONS[type]}
                {getDayTypeLabel(type)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Click on a day to mark it as a holiday or closure
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDates.map(date => {
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isToday = isSameDay(date, new Date());
              const dayType = getDayType(date);
              const calDay = getCalendarDay(date);
              const hasCustomEntry = !!calDay;

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDateClick(date)}
                  className={`
                    relative p-2 min-h-[80px] rounded-lg border transition-all
                    hover:ring-2 hover:ring-primary/50
                    ${isCurrentMonth ? 'bg-background' : 'bg-muted/30 opacity-50'}
                    ${isToday ? 'ring-2 ring-primary' : ''}
                    ${DAY_TYPE_COLORS[dayType].split(' ').slice(0, 2).join(' ')}
                    ${hasCustomEntry ? 'border-2' : 'border'}
                  `}
                >
                  <div className="text-right">
                    <span className={`
                      text-sm font-medium
                      ${isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center' : ''}
                    `}>
                      {format(date, 'd')}
                    </span>
                  </div>
                  {calDay?.name && (
                    <div className="text-xs truncate mt-1 font-medium">
                      {calDay.name}
                    </div>
                  )}
                  {hasCustomEntry && (
                    <div className="absolute bottom-1 left-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Special Days */}
      {calendarDays.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5" />
              {t("calendar.specialDays", "Special Days This Month")}
            </CardTitle>
            <CardDescription>
              {t("calendar.specialDaysDescription", "Custom calendar entries for this month")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {calendarDays
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(day => (
                  <div
                    key={day.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Badge
                        variant="outline"
                        className={`${DAY_TYPE_COLORS[day.day_type as DayType]} gap-1.5`}
                      >
                        {DAY_TYPE_ICONS[day.day_type as DayType]}
                        {getDayTypeLabel(day.day_type as DayType)}
                      </Badge>
                      <div>
                        <div className="font-medium">
                          {day.date ? format(new Date(day.date + 'T00:00:00'), 'EEEE, MMMM d') : 'Unknown date'}
                        </div>
                        {day.name && (
                          <div className="text-sm text-muted-foreground">{day.name}</div>
                        )}
                        {day.capacity_multiplier !== null && day.capacity_multiplier !== undefined && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Percent className="h-3 w-3" />
                            {Math.round(day.capacity_multiplier * 100)}% {t("calendar.capacity", "capacity")}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => day.date && handleDateClick(new Date(day.date + 'T00:00:00'))}
                      disabled={!day.date}
                    >
                      {t("common.edit", "Edit")}
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card sm:max-w-md overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <DialogDescription>
              {t("calendar.editDescription", "Configure this day's type and capacity settings")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-5">
            {/* Day Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("calendar.form.dayType", "Day Type")}
              </Label>
              <Select
                value={formData.day_type}
                onValueChange={(value: DayType) => {
                  const multiplier = value === 'working' ? 1 :
                                    value === 'half_day' ? 0.5 : 0;
                  setFormData({
                    ...formData,
                    day_type: value,
                    capacity_multiplier: multiplier
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['working', 'holiday', 'closure', 'half_day'] as DayType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {DAY_TYPE_ICONS[type]}
                        <span>{getDayTypeLabel(type)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name / Description */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                {t("calendar.form.name", "Name / Description")}
              </Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("calendar.form.namePlaceholder", "e.g., Christmas, Factory Maintenance")}
                className="w-full"
              />
            </div>

            {/* Time Override for Half Day */}
            {(formData.day_type === 'half_day' || formData.day_type === 'working') && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t("calendar.form.timeOverride", "Time Override")}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="opening_time" className="text-xs text-muted-foreground">
                      {t("calendar.form.openingTime", "Opening")}
                    </Label>
                    <Input
                      id="opening_time"
                      type="time"
                      value={formData.opening_time || ''}
                      onChange={(e) => setFormData({ ...formData, opening_time: e.target.value || null })}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="closing_time" className="text-xs text-muted-foreground">
                      {t("calendar.form.closingTime", "Closing")}
                    </Label>
                    <Input
                      id="closing_time"
                      type="time"
                      value={formData.closing_time || ''}
                      onChange={(e) => setFormData({ ...formData, closing_time: e.target.value || null })}
                      className="w-full"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("calendar.form.timeHint", "Leave empty to use default factory hours")}
                </p>
              </div>
            )}

            {/* Capacity Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  {t("calendar.form.capacity", "Capacity")}
                </Label>
                <Badge variant="outline" className="font-mono">
                  {Math.round(getCapacityMultiplier() * 100)}%
                </Badge>
              </div>
              <Slider
                value={[getCapacityMultiplier() * 100]}
                onValueChange={(value) => setFormData({
                  ...formData,
                  capacity_multiplier: value[0] / 100
                })}
                min={0}
                max={100}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("calendar.form.closed", "Closed")}</span>
                <span>{t("calendar.form.halfCapacity", "Half")}</span>
                <span>{t("calendar.form.fullCapacity", "Full")}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                {t("calendar.form.notes", "Notes")}
              </Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                placeholder={t("calendar.form.notesPlaceholder", "Additional notes...")}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 flex gap-2 border-t pt-4">
            {selectedDate && getCalendarDay(selectedDate)?.id && (
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={saving}
                size="icon"
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="flex-1"
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("calendar.deleteDialog.title", "Delete Calendar Entry")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("calendar.deleteDialog.description", "Are you sure you want to remove this calendar entry? The day will revert to default settings.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>
              {t("common.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
