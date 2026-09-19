const DAY_MS = 24 * 60 * 60 * 1000;

type OperationStatus = "not_started" | "in_progress" | "completed" | "on_hold";

export interface FactoryCalendarSeed {
  date: string;
  day_type: "holiday" | "closure" | "half_day";
  name: string;
  capacity_multiplier: number;
  opening_time?: string;
  closing_time?: string;
  notes?: string;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(startOfUtcDay(date).getTime() + days * DAY_MS);
}

function atUtcHour(date: Date, hour: number): Date {
  const result = startOfUtcDay(date);
  result.setUTCHours(hour);
  return result;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function moveToWorkingDay(date: Date, direction: 1 | -1): Date {
  let candidate = startOfUtcDay(date);

  while (true) {
    const day = candidate.getUTCDay();
    const calendarEntry = calendarForYear(candidate.getUTCFullYear()).find(
      (entry) => entry.date === dateKey(candidate),
    );
    const closed = calendarEntry?.day_type === "holiday" || calendarEntry?.day_type === "closure";
    if (day !== 0 && day !== 6 && !closed) return candidate;
    candidate = addUtcDays(candidate, direction);
  }
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

function calendarForYear(year: number): FactoryCalendarSeed[] {
  const easter = easterSunday(year);
  const kingsDay = new Date(Date.UTC(year, 3, 27));
  if (kingsDay.getUTCDay() === 0) kingsDay.setUTCDate(26);

  const holiday = (date: Date, name: string): FactoryCalendarSeed => ({
    date: dateKey(date),
    day_type: "holiday",
    name,
    capacity_multiplier: 0,
  });
  const fixed = (month: number, day: number) => new Date(Date.UTC(year, month, day));

  return [
    holiday(fixed(0, 1), "Nieuwjaarsdag"),
    holiday(addUtcDays(easter, -2), "Goede Vrijdag"),
    holiday(easter, "Eerste Paasdag"),
    holiday(addUtcDays(easter, 1), "Tweede Paasdag"),
    holiday(kingsDay, "Koningsdag"),
    holiday(fixed(4, 5), "Bevrijdingsdag"),
    holiday(addUtcDays(easter, 39), "Hemelvaartsdag"),
    holiday(addUtcDays(easter, 49), "Eerste Pinksterdag"),
    holiday(addUtcDays(easter, 50), "Tweede Pinksterdag"),
    {
      date: dateKey(fixed(11, 24)),
      day_type: "half_day",
      name: "Kerstavond",
      capacity_multiplier: 0.5,
      opening_time: "08:00",
      closing_time: "12:00",
      notes: "Fabriek sluit om 12:00",
    },
    holiday(fixed(11, 25), "Eerste Kerstdag"),
    holiday(fixed(11, 26), "Tweede Kerstdag"),
    {
      date: dateKey(fixed(11, 29)),
      day_type: "closure",
      name: "Kerstvakantie",
      capacity_multiplier: 0,
      notes: "Fabriek gesloten tussen Kerst en Nieuwjaar",
    },
    {
      date: dateKey(fixed(11, 30)),
      day_type: "closure",
      name: "Kerstvakantie",
      capacity_multiplier: 0,
      notes: "Fabriek gesloten tussen Kerst en Nieuwjaar",
    },
    {
      date: dateKey(fixed(11, 31)),
      day_type: "half_day",
      name: "Oudejaarsdag",
      capacity_multiplier: 0.5,
      opening_time: "08:00",
      closing_time: "12:00",
      notes: "Fabriek sluit om 12:00",
    },
  ];
}

export function createDutchFactoryCalendar(reference = new Date()): FactoryCalendarSeed[] {
  const today = dateKey(reference);
  const year = reference.getUTCFullYear();

  return [...calendarForYear(year), ...calendarForYear(year + 1)]
    .filter((entry) => entry.date >= today)
    .sort((left, right) => left.date.localeCompare(right.date));
}

interface TimelineJob {
  createdAt: string;
  dueAt: string;
}

export function createMockDataTimeline(reference = new Date()) {
  const at = (days: number, hour = 0) => {
    const direction = days < 0 ? -1 : 1;
    return atUtcHour(moveToWorkingDay(addUtcDays(reference, days), direction), hour).toISOString();
  };
  const job = (createdDays: number, dueDays: number): TimelineJob => ({
    createdAt: at(createdDays, 9),
    dueAt: at(dueDays),
  });

  return {
    jobs: {
      completed: job(-70, -14),
      inProgress: [job(-56, 7), job(-42, 14), job(-28, 21), job(-14, 35)],
      notStarted: job(-7, 49),
    },
    timeEntriesFrom: at(-60, 8),
    quantityRecordsFrom: at(-50),
    issuesFrom: at(-35),
    lotYear: reference.getUTCFullYear(),
  };
}

export function createPlannedWindow({
  reference = new Date(),
  dueAt,
  sequence,
  status,
  estimatedMinutes,
}: {
  reference?: Date;
  dueAt: string;
  sequence: number;
  status: OperationStatus;
  estimatedMinutes: number;
}): { plannedStart: string; plannedEnd: string } {
  let day: Date;

  if (status === "completed") {
    day = moveToWorkingDay(
      addUtcDays(reference, -Math.max(1, 7 - Math.floor(sequence / 10))),
      -1,
    );
  } else if (status === "in_progress" || status === "on_hold") {
    day = moveToWorkingDay(reference, 1);
  } else {
    const daysBeforeDue = Math.max(1, 6 - Math.floor(sequence / 10));
    const candidate = addUtcDays(new Date(dueAt), -daysBeforeDue);
    const tomorrow = moveToWorkingDay(addUtcDays(reference, 1), 1);
    day = moveToWorkingDay(candidate < tomorrow ? tomorrow : candidate, 1);
  }

  const start = atUtcHour(day, 8);
  const end = new Date(start.getTime() + Math.max(30, estimatedMinutes) * 60 * 1000);

  return {
    plannedStart: start.toISOString(),
    plannedEnd: end.toISOString(),
  };
}
