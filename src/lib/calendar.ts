import dayjs, { Dayjs } from "dayjs";

export interface CalendarDay {
  date: Dayjs;
  weekday: number;
  isWeekend: boolean;
  isHoliday: boolean;
  isWorkday: boolean;
}

/**
 * Build a daily calendar for a given year with weekends, holidays, and workdays.
 */
export function buildCalendar(year: number, holidays: Dayjs[]): CalendarDay[] {
  const start = dayjs(`${year}-01-01`);
  const end = dayjs(`${year}-12-31`);

  const days: CalendarDay[] = [];
  for (
    let d = start;
    d.isBefore(end) || d.isSame(end, "day");
    d = d.add(1, "day")
  ) {
    const weekday = d.day(); // Sunday = 0, Saturday = 6
    const isWeekend = weekday === 0 || weekday === 6;
    const isHoliday = holidays.some((h) => h.isSame(d, "day"));
    const isWorkday = !isWeekend && !isHoliday;
    days.push({ date: d, weekday, isWeekend, isHoliday, isWorkday });
  }

  return days;
}
