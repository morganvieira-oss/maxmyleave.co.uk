"use client";

import {
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from "react";
import LeaveOptionRow from "./leave-option-row";

interface LeaveResult {
  leaveStartDate: string;
  leaveEndDate: string;
  breakStartDate: string;
  breakEndDate: string;
  leaveDates: string[];
  overlappingMandatoryDates: string[];
  totalLeaveDays: number;
  breakLength: number;
  freeDays: number;
  leaveDaysUsed: number;
  efficiency: number;
  type: "bridge" | "extension" | "standalone";
  description: string;
}

interface LeaveOptionsDisplayProps {
  results: LeaveResult[];
  year: number;
  region?: string;
  annualLeaveDays: number;
  mandatoryLeaveDates?: string[];
  nonWorkingMandatoryDates?: string[];
  ignoredMandatoryDates?: string[];
  remainingAllowance?: number;
  overbooked?: boolean;
}

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface TooltipCellProps {
  className: string;
  tooltipLines: string[];
  children: ReactNode;
  style?: CSSProperties;
}

function TooltipCell({
  className,
  tooltipLines,
  children,
  style,
}: TooltipCellProps) {
  const label = tooltipLines.join(". ");

  return (
    <div className="group relative w-full">
      <div
        className={className}
        style={style}
        tabIndex={0}
        aria-label={label || undefined}
      >
        {children}
      </div>
      {tooltipLines.length > 0 && (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 z-20 hidden w-max max-w-[14rem] -translate-x-1/2 -translate-y-2 rounded-md border px-2 py-1 text-[10px] leading-snug shadow-lg group-focus-within:flex group-hover:flex"
          style={{
            borderColor: "rgb(var(--border) / 0.6)",
            backgroundColor: "rgb(var(--surface-soft) / 0.95)",
            color: "rgb(var(--foreground))",
          }}
        >
          <div className="flex flex-col gap-[2px] text-left">
            {tooltipLines.map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeaveOptionsDisplay({
  results,
  year,
  region = "england-and-wales",
  annualLeaveDays,
  mandatoryLeaveDates = [],
  nonWorkingMandatoryDates = [],
  ignoredMandatoryDates = [],
  remainingAllowance,
  overbooked = false,
}: LeaveOptionsDisplayProps) {
  const [holidays, setHolidays] = useState<string[]>([]);

  const parseIsoDate = (value: string): Date => {
    const [yearStr, monthStr, dayStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const day = Number(dayStr);
    return new Date(year, month, day);
  };

  const formatCount = (count: number, noun: string): string =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;

  const formatDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatDisplayDate = (date: Date): string =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // Fetch holidays when component mounts
  useEffect(() => {
    fetch("https://www.gov.uk/bank-holidays.json")
      .then((res) => res.json())
      .then((data: any) => {
        const events = data[region]?.events || [];
        const holidayDates = events
          .filter((event: any) => event.date.startsWith(year.toString()))
          .map((event: any) => event.date);
        setHolidays(holidayDates);
      })
      .catch(() => {
        // Fallback to some common holidays if API fails
        setHolidays([
          `${year}-01-01`, // New Year's Day
          `${year}-12-25`, // Christmas Day
          `${year}-12-26`, // Boxing Day
        ]);
      });
  }, [year, region]);

  const normalisedResults = useMemo(() => {
    if (!Array.isArray(results)) {
      return [] as LeaveResult[];
    }

    const uniqueMap = new Map<string, LeaveResult>();

    for (const result of results) {
      const leaveKey = [...result.leaveDates].sort().join("|");
      const key = `${result.breakStartDate}|${result.breakEndDate}|${leaveKey}`;
      const existing = uniqueMap.get(key);

      if (!existing) {
        uniqueMap.set(key, result);
        continue;
      }

      const shouldReplace =
        result.leaveDaysUsed < existing.leaveDaysUsed ||
        (result.leaveDaysUsed === existing.leaveDaysUsed &&
          result.efficiency > existing.efficiency) ||
        (result.leaveDaysUsed === existing.leaveDaysUsed &&
          result.efficiency === existing.efficiency &&
          new Date(result.breakStartDate).getTime() <
            new Date(existing.breakStartDate).getTime());

      if (shouldReplace) {
        uniqueMap.set(key, result);
      }
    }

    const uniqueResults = Array.from(uniqueMap.values());

    uniqueResults.sort((a, b) => {
      const startDiff =
        new Date(a.breakStartDate).getTime() -
        new Date(b.breakStartDate).getTime();
      if (startDiff !== 0) {
        return startDiff;
      }

      const endDiff =
        new Date(a.breakEndDate).getTime() - new Date(b.breakEndDate).getTime();
      if (endDiff !== 0) {
        return endDiff;
      }

      return b.breakLength - a.breakLength;
    });

    return uniqueResults;
  }, [results]);

  const groupedBreaks = useMemo(() => {
    if (normalisedResults.length === 0) {
      return [] as Array<{ primary: LeaveResult; variants: LeaveResult[] }>;
    }

    const groupMap = new Map<string, LeaveResult[]>();

    for (const result of normalisedResults) {
      const key = result.breakStartDate;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(result);
    }

    const grouped = Array.from(groupMap.values()).map((group) => {
      const sortedGroup = group.slice().sort((a, b) => {
        if (a.leaveDaysUsed !== b.leaveDaysUsed) {
          return a.leaveDaysUsed - b.leaveDaysUsed;
        }
        if (b.breakLength !== a.breakLength) {
          return b.breakLength - a.breakLength;
        }
        return (
          new Date(a.breakEndDate).getTime() -
          new Date(b.breakEndDate).getTime()
        );
      });

      return {
        primary: sortedGroup[0],
        variants: sortedGroup.slice(1),
      };
    });

    grouped.sort((a, b) => {
      const startDiff =
        new Date(a.primary.breakStartDate).getTime() -
        new Date(b.primary.breakStartDate).getTime();
      if (startDiff !== 0) {
        return startDiff;
      }
      return (
        new Date(a.primary.breakEndDate).getTime() -
        new Date(b.primary.breakEndDate).getTime()
      );
    });

    return grouped;
  }, [normalisedResults]);

  const monthGroups = useMemo(() => {
    if (groupedBreaks.length === 0) {
      return [] as Array<{
        key: string;
        label: string;
        year: number;
        month: number;
        entries: Array<{
          primary: LeaveResult;
          variants: LeaveResult[];
          displayIndex: number;
        }>;
      }>;
    }

    const monthMap = new Map<
      string,
      {
        key: string;
        label: string;
        year: number;
        month: number;
        entries: Array<{
          primary: LeaveResult;
          variants: LeaveResult[];
          displayIndex: number;
        }>;
      }
    >();

    let runningIndex = 0;

    for (const entry of groupedBreaks) {
      const startDate = new Date(entry.primary.breakStartDate);
      const key = `${startDate.getFullYear()}-${startDate.getMonth()}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, {
          key,
          label: startDate.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          }),
          year: startDate.getFullYear(),
          month: startDate.getMonth(),
          entries: [],
        });
      }

      monthMap.get(key)!.entries.push({
        primary: entry.primary,
        variants: entry.variants,
        displayIndex: runningIndex,
      });

      runningIndex += 1;
    }

    return Array.from(monthMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year;
        }
        return a.month - b.month;
      })
      .map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) => a.displayIndex - b.displayIndex),
      }));
  }, [groupedBreaks]);

  const aggregateSummary = useMemo(() => {
    if (normalisedResults.length === 0) {
      return null;
    }

    const totals = normalisedResults.reduce<{
      totalLeaveDays: number;
      totalBreakDays: number;
    }>(
      (acc, option) => {
        acc.totalLeaveDays += option.leaveDaysUsed;
        acc.totalBreakDays += option.breakLength;
        return acc;
      },
      { totalLeaveDays: 0, totalBreakDays: 0 }
    );

    const allowanceBaseline = annualLeaveDays > 0 ? annualLeaveDays : null;
    const remainingAfterAll =
      allowanceBaseline !== null
        ? Math.max(allowanceBaseline - totals.totalLeaveDays, 0)
        : null;

    return {
      totalLeaveDays: totals.totalLeaveDays,
      totalBreakDays: totals.totalBreakDays,
      optionCount: normalisedResults.length,
      allowanceBaseline,
      remainingAfterAll,
    };
  }, [normalisedResults, annualLeaveDays]);

  const summaryCards = useMemo(() => {
    const cards: Array<{ label: string; value: string; helper?: string }> = [];

    if (typeof remainingAllowance === "number") {
      cards.push({
        label: "Annual leave remaining",
        value: `${remainingAllowance}`,
        helper: "after reserving must-have days",
      });
    }

    if (normalisedResults.length > 0) {
      const longestBreak = normalisedResults.reduce(
        (max, option) => Math.max(max, option.breakLength),
        0
      );
      if (longestBreak > 0) {
        cards.push({
          label: "Biggest break available",
          value: `${longestBreak}`,
          helper: "days off including weekends and holidays",
        });
      }
    }

    const mustHaveCount = mandatoryLeaveDates.length;
    if (mustHaveCount > 0) {
      cards.push({
        label: "Pinned must-have days",
        value: `${mustHaveCount}`,
        helper: "already accounted for here",
      });
    }

    if (annualLeaveDays > 0) {
      cards.unshift({
        label: "Annual leave allowance",
        value: `${annualLeaveDays}`,
        helper: "total days you can book this year",
      });
    }

    return cards;
  }, [
    annualLeaveDays,
    remainingAllowance,
    normalisedResults,
    mandatoryLeaveDates.length,
  ]);

  const mustHaveRange = useMemo(() => {
    if (mandatoryLeaveDates.length === 0) {
      return null;
    }

    const sorted = [...mandatoryLeaveDates].sort();
    const start = parseIsoDate(sorted[0]);
    const end = parseIsoDate(sorted[sorted.length - 1]);

    return { start, end };
  }, [mandatoryLeaveDates]);

  const pinnedCalendarMonths = useMemo(() => {
    const monthMap = new Map<
      string,
      {
        year: number;
        month: number;
        mandatory: Set<string>;
        nonWorking: Set<string>;
      }
    >();

    const addDate = (iso: string, type: "mandatory" | "nonWorking") => {
      if (!iso) {
        return;
      }
      const date = parseIsoDate(iso);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, {
          year: date.getFullYear(),
          month: date.getMonth(),
          mandatory: new Set<string>(),
          nonWorking: new Set<string>(),
        });
      }

      const bucket = monthMap.get(key)!;
      bucket[type].add(iso);
    };

    mandatoryLeaveDates.forEach((date) => addDate(date, "mandatory"));
    nonWorkingMandatoryDates.forEach((date) => addDate(date, "nonWorking"));

    return Array.from(monthMap.values()).sort((a, b) => {
      const aDate = new Date(a.year, a.month, 1).getTime();
      const bDate = new Date(b.year, b.month, 1).getTime();
      return aDate - bDate;
    });
  }, [mandatoryLeaveDates, nonWorkingMandatoryDates]);

  const buildPinnedCalendar = (
    yearValue: number,
    monthValue: number,
    mandatorySet: Set<string>,
    nonWorkingSet: Set<string>
  ) => {
    const firstDay = new Date(yearValue, monthValue, 1);
    const startCalendar = new Date(firstDay);
    const daysToGoBack = (startCalendar.getDay() + 6) % 7;
    startCalendar.setDate(startCalendar.getDate() - daysToGoBack);

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      status: "mandatory" | "nonWorking" | null;
    }> = [];
    const currentDate = new Date(startCalendar);

    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = currentDate.getMonth() === monthValue;
      const key = formatDateKey(currentDate);
      let status: "mandatory" | "nonWorking" | null = null;

      if (mandatorySet.has(key)) {
        status = "mandatory";
      } else if (nonWorkingSet.has(key)) {
        status = "nonWorking";
      }

      days.push({
        date: new Date(currentDate),
        isCurrentMonth,
        status,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const hasIgnored = ignoredMandatoryDates.length > 0;
  const hasBreakResults = monthGroups.length > 0;
  const hasPinnedMonths = pinnedCalendarMonths.length > 0;

  return (
    <div className="space-y-6">
      {summaryCards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border p-4 shadow-sm transition-colors duration-[400ms]"
              style={{
                backgroundColor: "rgb(var(--surface) / 0.9)",
                borderColor: "rgb(var(--border))",
                boxShadow: "0 12px 32px rgb(var(--foreground) / 0.05)",
              }}
            >
              <div className="text-muted-foreground text-xs tracking-wide uppercase transition-colors duration-[400ms]">
                {card.label}
              </div>
              <div className="text-foreground mt-2 text-3xl font-semibold transition-colors duration-[400ms]">
                {card.value}
              </div>
              {card.helper && (
                <div className="text-muted-foreground mt-1 text-xs transition-colors duration-[400ms]">
                  {card.helper}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasBreakResults && (
        <div
          className="text-muted-foreground rounded-lg border p-6 text-sm shadow-sm transition-colors duration-[400ms]"
          style={{
            backgroundColor: "rgb(var(--surface) / 0.9)",
            borderColor: "rgb(var(--border))",
            boxShadow: "0 12px 32px rgb(var(--foreground) / 0.05)",
          }}
        >
          No leave combinations fit within your remaining allowance right now.
          Adjust your must-have dates or allowance to explore more options.
        </div>
      )}

      {monthGroups.map((group) => {
        const breakSummaries = group.entries.map(
          ({ primary, variants, displayIndex }) => {
            const start = parseIsoDate(primary.breakStartDate);
            const end = parseIsoDate(primary.breakEndDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            return {
              primary,
              variants,
              displayIndex,
              leaveSet: new Set(primary.leaveDates),
              start,
              end,
              label: `Break ${displayIndex + 1}`,
            };
          }
        );

        const firstDay = new Date(group.year, group.month, 1);
        const startCalendar = new Date(firstDay);
        const daysToGoBack = (startCalendar.getDay() + 6) % 7;
        startCalendar.setDate(startCalendar.getDate() - daysToGoBack);

        const holidaySet = new Set(holidays);
        const calendarCells: Array<{
          date: Date;
          classes: string;
          tooltipLines: string[];
          style: CSSProperties;
        }> = [];

        const cursor = new Date(startCalendar);
        for (let i = 0; i < 42; i++) {
          const cellDate = new Date(cursor);
          const dateKey = formatDateKey(cellDate);
          const isCurrentMonth = cellDate.getMonth() === group.month;
          const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
          const isHoliday = holidaySet.has(dateKey);

          const activeBreaks = breakSummaries.filter(
            (summary) => cellDate >= summary.start && cellDate <= summary.end
          );
          const isLeaveDay = activeBreaks.some((summary) =>
            summary.leaveSet.has(dateKey)
          );
          const tooltipParts: string[] = [
            cellDate.toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            }),
          ];
          let classes =
            "relative flex items-center justify-center rounded border p-2 text-sm transition-colors duration-200 ";
          const style: CSSProperties = {
            borderColor: "rgb(var(--border) / 0.5)",
            backgroundColor: "rgb(var(--surface-muted) / 0.45)",
            color: "rgb(var(--foreground))",
          };

          if (isLeaveDay) {
            classes += "font-semibold";
            style.borderColor = `rgb(var(--calendar-leave))`;
            style.backgroundColor = `rgb(var(--calendar-leave))`;
            style.color = `rgb(var(--calendar-leave-text))`;
            if (!isCurrentMonth) {
              style.opacity = 0.8;
            }
          } else if (isHoliday) {
            style.borderColor = `rgb(var(--calendar-holiday) / 0.65)`;
            style.backgroundColor = `rgb(var(--calendar-holiday) / 0.55)`;
            style.color = `rgb(var(--calendar-holiday-text))`;
            if (!isCurrentMonth) {
              style.opacity = 0.7;
            }
          } else if (isWeekend) {
            style.borderColor = `rgb(var(--calendar-weekend) / 0.65)`;
            style.backgroundColor = `rgb(var(--calendar-weekend) / 0.45)`;
            style.color = `rgb(var(--calendar-weekend-text))`;
            if (!isCurrentMonth) {
              style.opacity = 0.7;
            }
          } else if (activeBreaks.length > 0) {
            style.borderColor = `rgb(var(--calendar-break) / 0.7)`;
            style.backgroundColor = `rgb(var(--calendar-break) / 0.45)`;
            style.color = `rgb(var(--calendar-break-text))`;
            if (!isCurrentMonth) {
              style.opacity = 0.7;
            }
          } else if (!isCurrentMonth) {
            style.borderColor = "transparent";
            style.color = "rgb(var(--muted-foreground) / 0.6)";
            style.opacity = 0.6;
            tooltipParts.push("outside this month");
          } else {
            style.borderColor = "transparent";
            style.color = "rgb(var(--foreground))";
          }

          if (activeBreaks.length > 0) {
            // Use the first break for badge context; users can expand cards for more detail.
            const describeDay = (summary: (typeof breakSummaries)[number]) => {
              if (summary.leaveSet.has(dateKey)) {
                return "leave day to book";
              }
              if (isHoliday) {
                return "bank holiday in break";
              }
              if (isWeekend) {
                return "weekend in break";
              }
              return "bonus day in break";
            };

            tooltipParts.push(
              ...activeBreaks.map(
                (summary) => `${summary.label}: ${describeDay(summary)}`
              )
            );
          } else if (isHoliday) {
            tooltipParts.push("bank holiday");
          } else if (isWeekend) {
            tooltipParts.push("weekend");
          }

          calendarCells.push({
            date: cellDate,
            classes,
            tooltipLines: tooltipParts,
            style,
          });

          cursor.setDate(cursor.getDate() + 1);
        }

        return (
          <div key={group.key} className="space-y-4">
            <div className="text-foreground text-lg font-semibold transition-colors duration-[400ms]">
              {group.label}
            </div>
            <div className="space-y-4">
              <div>
                <h5 className="text-foreground mb-3 text-sm font-medium transition-colors duration-[400ms]">
                  Break highlights this month
                </h5>
                <div className="space-y-4">
                  {group.entries.map(({ primary, variants, displayIndex }) => (
                    <LeaveOptionRow
                      key={`${primary.breakStartDate}-${primary.breakEndDate}`}
                      result={primary}
                      index={displayIndex}
                      availableAllowance={
                        typeof remainingAllowance === "number"
                          ? remainingAllowance
                          : undefined
                      }
                      totalAllowance={annualLeaveDays}
                      mandatoryLeaveCount={mandatoryLeaveDates.length}
                      variants={variants}
                    />
                  ))}
                </div>
              </div>

              <div
                className="rounded-lg border p-4 shadow-sm transition-colors duration-[400ms]"
                style={{
                  backgroundColor: "rgb(var(--surface) / 0.9)",
                  borderColor: "rgb(var(--border))",
                  boxShadow: "0 12px 32px rgb(var(--foreground) / 0.05)",
                }}
              >
                <h5 className="text-foreground mb-3 text-sm font-medium transition-colors duration-[400ms]">
                  Monthly overview
                </h5>
                <div className="text-muted-foreground grid grid-cols-7 gap-1 text-[11px]">
                  {DAY_LABELS.map((day) => (
                    <div key={day} className="text-center font-semibold">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {calendarCells.map((cell, cellIndex) => (
                    <TooltipCell
                      key={`${cell.date.toISOString()}-${cellIndex}`}
                      className={cell.classes}
                      tooltipLines={cell.tooltipLines}
                      style={cell.style}
                    >
                      {cell.date.getDate()}
                    </TooltipCell>
                  ))}
                </div>
                <div className="text-muted-foreground mt-3 flex flex-wrap justify-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: "rgb(var(--calendar-leave))" }}
                    ></span>
                    <span>Annual leave to book</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{
                        backgroundColor: "rgb(var(--calendar-holiday) / 0.65)",
                      }}
                    ></span>
                    <span>Bank holiday</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{
                        backgroundColor: "rgb(var(--calendar-weekend) / 0.65)",
                      }}
                    ></span>
                    <span>Weekend</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {hasPinnedMonths && (
        <div className="space-y-4">
          <div className="text-foreground text-lg font-semibold transition-colors duration-[400ms]">
            pinned must-have days
          </div>
          <div className="text-muted-foreground space-y-1 text-sm">
            {mustHaveRange && (
              <div>
                These must-stay-free dates span{" "}
                {mustHaveRange.start.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}{" "}
                →{" "}
                {mustHaveRange.end.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}
                .
              </div>
            )}
            {hasIgnored && (
              <div>
                We skipped{" "}
                {ignoredMandatoryDates
                  .map((date) =>
                    new Date(date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })
                  )
                  .join(", ")}{" "}
                because they fall outside this planner's year.
              </div>
            )}
            {overbooked && (
              <div style={{ color: "rgb(var(--destructive))" }}>
                ⚠️ You've selected more must-have leave than your allowance
                covers. Consider freeing up days or increasing your allowance.
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {pinnedCalendarMonths.map(
              ({
                year: calendarYear,
                month: calendarMonth,
                mandatory,
                nonWorking,
              }) => {
                const monthLabel = new Date(
                  calendarYear,
                  calendarMonth,
                  1
                ).toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                });
                const days = buildPinnedCalendar(
                  calendarYear,
                  calendarMonth,
                  mandatory,
                  nonWorking
                );
                const holidaySet = new Set(holidays);

                return (
                  <div
                    key={`${calendarYear}-${calendarMonth}`}
                    className="rounded-lg border p-4 shadow-sm transition-colors duration-[400ms]"
                    style={{
                      backgroundColor: "rgb(var(--surface) / 0.9)",
                      borderColor: "rgb(var(--border))",
                      boxShadow: "0 12px 32px rgb(var(--foreground) / 0.05)",
                    }}
                  >
                    <h5 className="text-foreground mb-3 text-center text-sm font-medium transition-colors duration-[400ms]">
                      {monthLabel}
                    </h5>
                    <div className="text-muted-foreground grid grid-cols-7 gap-1 text-[11px]">
                      {DAY_LABELS.map((day) => (
                        <div key={day} className="text-center font-semibold">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1">
                      {days.map(({ date, isCurrentMonth, status }, index) => {
                        const dateKey = formatDateKey(date);
                        const isWeekend =
                          date.getDay() === 0 || date.getDay() === 6;
                        const isHoliday = holidaySet.has(dateKey);
                        let classes =
                          "text-center p-2 text-sm rounded border transition-colors duration-200 ";
                        const tooltipParts: string[] = [
                          date.toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          }),
                        ];
                        const style: CSSProperties = {
                          borderColor: "rgb(var(--border) / 0.5)",
                          backgroundColor: "rgb(var(--surface-muted) / 0.45)",
                          color: "rgb(var(--foreground))",
                        };

                        if (!isCurrentMonth) {
                          style.borderColor = "transparent";
                          style.color = "rgb(var(--muted-foreground) / 0.6)";
                          style.opacity = 0.6;
                          tooltipParts.push("outside this month");
                        } else if (status === "mandatory") {
                          classes += "font-semibold";
                          style.borderColor = `rgb(var(--calendar-leave))`;
                          style.backgroundColor = `rgb(var(--calendar-leave))`;
                          style.color = `rgb(var(--calendar-leave-text))`;
                          tooltipParts.push("must-have leave to book");
                        } else if (status === "nonWorking") {
                          style.borderColor = `rgb(var(--calendar-nonworking) / 0.75)`;
                          style.backgroundColor = `rgb(var(--calendar-nonworking) / 0.45)`;
                          style.color = `rgb(var(--calendar-nonworking-text))`;
                          tooltipParts.push("already free (no leave needed)");
                        } else if (isHoliday) {
                          style.borderColor = `rgb(var(--calendar-holiday) / 0.65)`;
                          style.backgroundColor = `rgb(var(--calendar-holiday) / 0.55)`;
                          style.color = `rgb(var(--calendar-holiday-text))`;
                          tooltipParts.push("bank holiday");
                        } else if (isWeekend) {
                          style.borderColor = `rgb(var(--calendar-weekend) / 0.65)`;
                          style.backgroundColor = `rgb(var(--calendar-weekend) / 0.45)`;
                          style.color = `rgb(var(--calendar-weekend-text))`;
                          tooltipParts.push("weekend");
                        } else {
                          style.borderColor = "transparent";
                          style.color = "rgb(var(--foreground))";
                        }

                        return (
                          <TooltipCell
                            key={index}
                            className={classes}
                            tooltipLines={tooltipParts}
                            style={style}
                          >
                            {date.getDate()}
                          </TooltipCell>
                        );
                      })}
                    </div>
                    <div className="text-muted-foreground mt-3 flex flex-wrap justify-center gap-4 text-[11px]">
                      <div className="flex items-center gap-1">
                        <span
                          className="inline-block h-3 w-3 rounded"
                          style={{
                            backgroundColor: "rgb(var(--calendar-leave))",
                          }}
                        ></span>
                        <span>Must-have leave</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className="inline-block h-3 w-3 rounded"
                          style={{
                            backgroundColor:
                              "rgb(var(--calendar-holiday) / 0.65)",
                          }}
                        ></span>
                        <span>Bank holiday</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className="inline-block h-3 w-3 rounded"
                          style={{
                            backgroundColor:
                              "rgb(var(--calendar-weekend) / 0.65)",
                          }}
                        ></span>
                        <span>Weekend</span>
                      </div>
                      {nonWorking.size > 0 && (
                        <div className="flex items-center gap-1">
                          <span
                            className="inline-block h-3 w-3 rounded"
                            style={{
                              backgroundColor:
                                "rgb(var(--calendar-nonworking) / 0.65)",
                            }}
                          ></span>
                          <span>Already free</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {aggregateSummary && (
        <div
          className="rounded-lg border p-5 shadow-sm transition-colors duration-[400ms]"
          style={{
            backgroundColor: "rgb(var(--surface) / 0.92)",
            borderColor: "rgb(var(--border))",
            boxShadow: "0 12px 32px rgb(var(--foreground) / 0.05)",
          }}
        >
          <h5 className="text-foreground text-sm font-semibold tracking-wide uppercase transition-colors duration-[400ms]">
            planner highlights
          </h5>
          <p className="text-muted-foreground mt-1 text-sm transition-colors duration-[400ms]">
            Totals below reflect every break surfaced by the planner. Pick the
            combos that fit your allowance and appetite.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div
              className="rounded-md border p-3 transition-colors duration-[400ms]"
              style={{
                backgroundColor: "rgb(var(--surface-soft) / 0.9)",
                borderColor: "rgb(var(--border) / 0.7)",
              }}
            >
              <div className="text-muted-foreground text-xs tracking-wide uppercase">
                Proposed leave to book
              </div>
              <div className="text-foreground mt-1 text-xl font-semibold transition-colors duration-[400ms]">
                {formatCount(aggregateSummary.totalLeaveDays, "day")}
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                Total across all highlighted breaks
              </div>
            </div>
            <div
              className="rounded-md border p-3 transition-colors duration-[400ms]"
              style={{
                backgroundColor: "rgb(var(--surface-soft) / 0.9)",
                borderColor: "rgb(var(--border) / 0.7)",
              }}
            >
              <div className="text-muted-foreground text-xs tracking-wide uppercase">
                Time off unlocked
              </div>
              <div className="text-foreground mt-1 text-xl font-semibold transition-colors duration-[400ms]">
                {formatCount(aggregateSummary.totalBreakDays, "day")}
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                Weekends and bank holidays included
              </div>
            </div>
            {aggregateSummary.allowanceBaseline !== null && (
              <div
                className="rounded-md border p-3 transition-colors duration-[400ms]"
                style={{
                  backgroundColor: "rgb(var(--surface-soft) / 0.9)",
                  borderColor: "rgb(var(--border) / 0.7)",
                }}
              >
                <div className="text-muted-foreground text-xs tracking-wide uppercase">
                  Allowance remaining
                </div>
                <div className="text-foreground mt-1 text-xl font-semibold transition-colors duration-[400ms]">
                  {formatCount(aggregateSummary.remainingAfterAll ?? 0, "day")}
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  If you booked every option shown
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
