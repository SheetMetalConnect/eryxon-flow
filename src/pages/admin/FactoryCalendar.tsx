import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Sun,
  Moon,
  Factory
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
  isWeekend,
  startOfWeek,
  endOfWeek
} from "date-fns";

interface CalendarDay {
  id?: string;
  tenant_id?: string;
  date: string;
  day_type: 'working' | 'holiday' | 'closure' | 'half_day';
  name: string | null;
  opening_time: string | null;
  closing_time: string | null;
  capacity_multiplier: number;
  notes: string | null;
}

const DAY_TYPE_COLORS: Record<string, string> = {
  working: 'bg-green-100 text-green-800 border-green-200',
  holiday: 'bg-red-100 text-red-800 border-red-200',
  closure: 'bg-gray-200 text-gray-800 border-gray-300',
  half_day: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const DAY_TYPE_LABELS: Record<string, string> = {
  working: 'Working',
  holiday: 'Holiday',
  closure: 'Closure',
  half_day: 'Half Day',
};

export default function FactoryCalendar() {
  const { t } = useTranslation();
  const { profile, tenant } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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
      toast.error("Failed to load calendar");
    } else {
      setCalendarDays((data || []) as CalendarDay[]);
    }
    setLoading(false);
  };

  const isDefaultWorkingDay = (date: Date): boolean => {
    // JavaScript: 0=Sunday, 1=Monday, ..., 6=Saturday
    // Our mask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
    const jsDay = getDay(date);
    const maskBits = [64, 1, 2, 4, 8, 16, 32]; // Map JS day to our mask bits
    return (workingDaysMask & maskBits[jsDay]) !== 0;
  };

  const getCalendarDay = (date: Date): CalendarDay | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarDays.find(d => d.date === dateStr) || null;
  };

  const getDayType = (date: Date): string => {
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
        toast.success("Calendar updated");
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
            capacity_multiplier: formData.capacity_multiplier,
            notes: formData.notes || null,
          });

        if (error) throw error;
        toast.success("Calendar entry added");
      }

      setDialogOpen(false);
      loadCalendarDays();
    } catch (error: any) {
      console.error("Error saving calendar:", error);
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDate) return;

    const existing = getCalendarDay(selectedDate);
    if (!existing?.id) {
      setDialogOpen(false);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("factory_calendar")
        .delete()
        .eq("id", existing.id);

      if (error) throw error;
      toast.success("Calendar entry removed");
      setDialogOpen(false);
      loadCalendarDays();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    } finally {
      setSaving(false);
    }
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
      <div className="flex flex-wrap gap-3">
        <Badge className={`${DAY_TYPE_COLORS.working} border`}>
          <Sun className="h-3 w-3 mr-1" />
          Working
        </Badge>
        <Badge className={`${DAY_TYPE_COLORS.holiday} border`}>
          Holiday
        </Badge>
        <Badge className={`${DAY_TYPE_COLORS.closure} border`}>
          <Moon className="h-3 w-3 mr-1" />
          Closure
        </Badge>
        <Badge className={`${DAY_TYPE_COLORS.half_day} border`}>
          Half Day
        </Badge>
      </div>

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
            <CardTitle className="text-lg">Special Days This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {calendarDays
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(day => (
                  <div
                    key={day.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={DAY_TYPE_COLORS[day.day_type]}>
                        {DAY_TYPE_LABELS[day.day_type]}
                      </Badge>
                      <div>
                        <div className="font-medium">
                          {format(new Date(day.date + 'T00:00:00'), 'EEEE, MMMM d')}
                        </div>
                        {day.name && (
                          <div className="text-sm text-muted-foreground">{day.name}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDateClick(new Date(day.date + 'T00:00:00'))}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Day Type</Label>
              <Select
                value={formData.day_type}
                onValueChange={(value: any) => {
                  const multiplier = value === 'working' ? 1 :
                                    value === 'half_day' ? 0.5 : 0;
                  setFormData({
                    ...formData,
                    day_type: value,
                    capacity_multiplier: multiplier
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="working">Working Day</SelectItem>
                  <SelectItem value="holiday">Holiday (Closed)</SelectItem>
                  <SelectItem value="closure">Planned Closure</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name / Description</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Christmas, Factory Maintenance"
              />
            </div>

            {formData.day_type === 'half_day' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening_time">Opening Time</Label>
                  <Input
                    id="opening_time"
                    type="time"
                    value={formData.opening_time || ''}
                    onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing_time">Closing Time</Label>
                  <Input
                    id="closing_time"
                    type="time"
                    value={formData.closing_time || ''}
                    onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Capacity Multiplier: {(formData.capacity_multiplier * 100).toFixed(0)}%</Label>
              <Input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.capacity_multiplier}
                onChange={(e) => setFormData({ ...formData, capacity_multiplier: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                0% = Factory closed, 50% = Half capacity, 100% = Full capacity
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
              {getCalendarDay(selectedDate!)?.id && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
