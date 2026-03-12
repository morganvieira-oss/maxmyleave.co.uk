import dayjs, { Dayjs } from "dayjs";
import { getBankHolidays } from "./holidays";
import { buildCalendar, CalendarDay } from "./calendar";

export interface Result {
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
  efficiency: number; // breakLength / leaveDaysUsed
  type: "bridge" | "extension" | "standalone";
  description: string;
}

export interface MaximiseDaysOffResponse {
  options: Result[];
  mandatoryLeaveDates: string[];
  nonWorkingMandatoryDates: string[];
  ignoredMandatoryDates: string[];
  remainingAllowance: number;
  overbooked: boolean;
}

interface LeaveOpportunity {
  leaveStartIdx: number;
  leaveEndIdx: number;
  breakStartIdx: number;
  breakEndIdx: number;
  leaveDaysUsed: number;
  totalLeaveDays: number;
  overlapCount: number;
  breakLength: number;
  efficiency: number;
  type: "bridge" | "extension" | "standalone";
  description: string;
  anchorHolidays: string[];
  hasLeadingLeave: boolean;
  hasTrailingLeave: boolean;
}

interface HolidayCluster {
  startIdx: number;
  endIdx: number;
}

const MAX_SIDE_EXTENSION = 5;
const MAX_BRIDGE_GAP = 6;

export async function maximiseDaysOff(
  leaveAllowance: number,
  year: number,
  region: string = "england-and-wales",
  topN: number = 5,
  requiredLeaveDates: string[] = []
): Promise<MaximiseDaysOffResponse> {
  const holidays: Dayjs[] = await getBankHolidays(region);
  const calendar: CalendarDay[] = buildCalendar(year, holidays);

  const holidayMetadata = await getHolidayNames(region);
  const holidayNameMap = new Map<string, string>();
  holidayMetadata
    .filter((event) => event.date.startsWith(`${year}-`))
    .forEach((event) => {
      holidayNameMap.set(event.date, event.title);
    });

  const dateToIndex = new Map<string, number>();
  calendar.forEach((day, idx) => {
    dateToIndex.set(day.date.format("YYYY-MM-DD"), idx);
  });

  const normalizedRequiredDates = Array.from(
    new Set(
      (requiredLeaveDates ?? [])
        .map((date) => dayjs(date))
        .filter((value) => value.isValid())
        .map((value) => value.format("YYYY-MM-DD"))
    )
  );

  const mandatoryIndices = new Set<number>();
  const mandatoryLeaveDates: string[] = [];
  const nonWorkingMandatoryDates: string[] = [];
  const ignoredMandatoryDates: string[] = [];

  for (const date of normalizedRequiredDates) {
    if (!date.startsWith(`${year}-`)) {
      ignoredMandatoryDates.push(date);
      continue;
    }

    const idx = dateToIndex.get(date);
    if (idx === undefined) {
      ignoredMandatoryDates.push(date);
      continue;
    }

    const day = calendar[idx];
    if (!day.isWorkday) {
      nonWorkingMandatoryDates.push(date);
      continue;
    }

    mandatoryIndices.add(idx);
    mandatoryLeaveDates.push(date);
  }

  mandatoryLeaveDates.sort();
  nonWorkingMandatoryDates.sort();
  ignoredMandatoryDates.sort();

  const mandatoryWorkdayCount = mandatoryIndices.size;
  const remainingAllowance = Math.max(
    leaveAllowance - mandatoryWorkdayCount,
    0
  );
  const overbooked = mandatoryWorkdayCount > leaveAllowance;

  if (leaveAllowance < 1 && mandatoryWorkdayCount === 0) {
    return {
      options: [],
      mandatoryLeaveDates,
      nonWorkingMandatoryDates,
      ignoredMandatoryDates,
      remainingAllowance: 0,
      overbooked,
    };
  }

  const clusters = identifyHolidayClusters(calendar);
  const opportunities: LeaveOpportunity[] = [];

  for (const cluster of clusters) {
    opportunities.push(
      ...generateClusterExtensions(
        calendar,
        cluster,
        leaveAllowance,
        holidayNameMap,
        mandatoryIndices,
        remainingAllowance
      )
    );
  }

  opportunities.push(
    ...generateClusterBridges(
      calendar,
      clusters,
      leaveAllowance,
      holidayNameMap,
      mandatoryIndices,
      remainingAllowance
    )
  );

  if (opportunities.length < topN) {
    opportunities.push(
      ...findStandaloneOpportunities(
        calendar,
        leaveAllowance,
        mandatoryIndices,
        remainingAllowance
      )
    );
  }

  const validOpportunities = opportunities.filter(
    (op) => op.totalLeaveDays > 0 && op.leaveDaysUsed <= remainingAllowance
  );

  if (validOpportunities.length === 0) {
    return {
      options: [],
      mandatoryLeaveDates,
      nonWorkingMandatoryDates,
      ignoredMandatoryDates,
      remainingAllowance,
      overbooked,
    };
  }

  validOpportunities.sort((a, b) => {
    if (b.breakLength !== a.breakLength) {
      return b.breakLength - a.breakLength;
    }

    if (Math.abs(b.efficiency - a.efficiency) > 0.05) {
      return b.efficiency - a.efficiency;
    }

    const typeOrder: Record<LeaveOpportunity["type"], number> = {
      bridge: 0,
      extension: 1,
      standalone: 2,
    };

    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }

    if (a.leaveDaysUsed !== b.leaveDaysUsed) {
      return a.leaveDaysUsed - b.leaveDaysUsed;
    }

    if (a.breakStartIdx !== b.breakStartIdx) {
      return a.breakStartIdx - b.breakStartIdx;
    }

    if (a.breakEndIdx !== b.breakEndIdx) {
      return a.breakEndIdx - b.breakEndIdx;
    }

    return a.leaveStartIdx - b.leaveStartIdx;
  });

  const finalOpportunities = selectNonOverlappingOpportunities(
    validOpportunities,
    topN
  );

  const mandatoryDateSet = new Set(mandatoryLeaveDates);
  const formattedOptions = finalOpportunities.map((opportunity) =>
    formatResult(opportunity, calendar, mandatoryDateSet)
  );

  return {
    options: formattedOptions,
    mandatoryLeaveDates,
    nonWorkingMandatoryDates,
    ignoredMandatoryDates,
    remainingAllowance,
    overbooked,
  };
}

function formatResult(
  opportunity: LeaveOpportunity,
  calendar: CalendarDay[],
  mandatoryDateSet: Set<string>
): Result {
  const leaveDates: string[] = [];
  for (
    let idx = opportunity.leaveStartIdx;
    idx <= opportunity.leaveEndIdx;
    idx++
  ) {
    if (calendar[idx].isWorkday) {
      leaveDates.push(calendar[idx].date.format("YYYY-MM-DD"));
    }
  }

  const breakStartDate =
    calendar[opportunity.breakStartIdx].date.format("YYYY-MM-DD");
  const breakEndDate =
    calendar[opportunity.breakEndIdx].date.format("YYYY-MM-DD");
  const leaveStartDate = leaveDates[0] ?? breakStartDate;
  const leaveEndDate = leaveDates[leaveDates.length - 1] ?? breakEndDate;

  const overlappingMandatoryDates = leaveDates.filter((date) =>
    mandatoryDateSet.has(date)
  );
  const totalLeaveDays = leaveDates.length;
  const additionalLeaveNeeded = Math.max(
    0,
    totalLeaveDays - overlappingMandatoryDates.length
  );
  const breakLength = opportunity.breakLength;
  const freeDays = Math.max(0, breakLength - totalLeaveDays);
  const efficiency =
    additionalLeaveNeeded > 0
      ? breakLength / additionalLeaveNeeded
      : breakLength;

  return {
    leaveStartDate,
    leaveEndDate,
    breakStartDate,
    breakEndDate,
    leaveDates,
    overlappingMandatoryDates,
    totalLeaveDays,
    breakLength,
    freeDays,
    leaveDaysUsed: additionalLeaveNeeded,
    efficiency: Number(efficiency.toFixed(2)),
    type: opportunity.type,
    description: opportunity.description,
  };
}

function identifyHolidayClusters(calendar: CalendarDay[]): HolidayCluster[] {
  const clusters: HolidayCluster[] = [];

  for (let idx = 0; idx < calendar.length; idx++) {
    if (calendar[idx].isWorkday) {
      continue;
    }

    let start = idx;
    let end = idx;
    let hasHoliday = calendar[idx].isHoliday;

    while (start > 0 && !calendar[start - 1].isWorkday) {
      start--;
      hasHoliday = hasHoliday || calendar[start].isHoliday;
    }

    while (end < calendar.length - 1 && !calendar[end + 1].isWorkday) {
      end++;
      hasHoliday = hasHoliday || calendar[end].isHoliday;
    }

    if (hasHoliday) {
      clusters.push({ startIdx: start, endIdx: end });
    }

    idx = end;
  }

  return clusters;
}

function evaluateLeaveWindow(
  calendar: CalendarDay[],
  startIdx: number,
  endIdx: number,
  mandatoryIndices: Set<number>
): { totalLeaveDays: number; overlapCount: number } {
  let totalLeaveDays = 0;
  let overlapCount = 0;

  const start = Math.max(0, startIdx);
  const end = Math.min(calendar.length - 1, endIdx);

  for (let idx = start; idx <= end; idx++) {
    if (!calendar[idx].isWorkday) {
      continue;
    }

    totalLeaveDays++;
    if (mandatoryIndices.has(idx)) {
      overlapCount++;
    }
  }

  return { totalLeaveDays, overlapCount };
}

function generateClusterExtensions(
  calendar: CalendarDay[],
  cluster: HolidayCluster,
  leaveAllowance: number,
  holidayNames: Map<string, string>,
  mandatoryIndices: Set<number>,
  remainingAllowance: number
): LeaveOpportunity[] {
  const opportunities: LeaveOpportunity[] = [];
  const maxBefore = countConsecutiveWorkdays(
    calendar,
    cluster.startIdx - 1,
    -1,
    MAX_SIDE_EXTENSION
  );
  const maxAfter = countConsecutiveWorkdays(
    calendar,
    cluster.endIdx + 1,
    1,
    MAX_SIDE_EXTENSION
  );

  for (
    let before = 0;
    before <= Math.min(maxBefore, leaveAllowance);
    before++
  ) {
    for (
      let after = 0;
      after <= Math.min(maxAfter, leaveAllowance - before);
      after++
    ) {
      if (before === 0 && after === 0) {
        continue;
      }

      const leaveStartIdx = cluster.startIdx - before;
      const leaveEndIdx = cluster.endIdx + after;
      const { breakStartIdx, breakEndIdx } = expandBreakBounds(
        calendar,
        leaveStartIdx,
        leaveEndIdx
      );

      const anchorHolidays = collectHolidayNamesInRange(
        calendar,
        breakStartIdx,
        breakEndIdx,
        holidayNames
      );

      if (anchorHolidays.length === 0) {
        continue;
      }

      const { totalLeaveDays, overlapCount } = evaluateLeaveWindow(
        calendar,
        leaveStartIdx,
        leaveEndIdx,
        mandatoryIndices
      );

      if (totalLeaveDays === 0) {
        continue;
      }

      const additionalLeaveNeeded = Math.max(0, totalLeaveDays - overlapCount);

      if (additionalLeaveNeeded > remainingAllowance) {
        continue;
      }

      const breakLength = breakEndIdx - breakStartIdx + 1;
      const efficiency =
        additionalLeaveNeeded > 0
          ? breakLength / additionalLeaveNeeded
          : breakLength;

      const minBreakLength = anchorHolidays.length <= 1 ? 2 : 4;
      const minEfficiency = anchorHolidays.length <= 1 ? 1.5 : 2;

      if (breakLength < minBreakLength || efficiency < minEfficiency) {
        continue;
      }

      const type: LeaveOpportunity["type"] =
        before > 0 && after > 0 ? "bridge" : "extension";
      const holidaySummary = summariseHolidayAnchors(anchorHolidays);

      let description: string;
      if (additionalLeaveNeeded === 0) {
        description = `No extra leave needed - ${breakLength} days off using only must-have dates around ${holidaySummary}`;
      } else {
        const verbPhrase = type === "bridge" ? "bridging" : "extending";
        description = `By booking ${additionalLeaveNeeded} day${additionalLeaveNeeded !== 1 ? "s" : ""} ${verbPhrase} ${holidaySummary}, you get ${breakLength} days off`;
      }

      const hasLeadingLeave = before > 0;
      const hasTrailingLeave = after > 0;

      opportunities.push({
        leaveStartIdx,
        leaveEndIdx,
        breakStartIdx,
        breakEndIdx,
        leaveDaysUsed: additionalLeaveNeeded,
        totalLeaveDays,
        overlapCount,
        breakLength,
        efficiency,
        type,
        description,
        anchorHolidays,
        hasLeadingLeave,
        hasTrailingLeave,
      });
    }
  }

  return opportunities;
}

function generateClusterBridges(
  calendar: CalendarDay[],
  clusters: HolidayCluster[],
  leaveAllowance: number,
  holidayNames: Map<string, string>,
  mandatoryIndices: Set<number>,
  remainingAllowance: number
): LeaveOpportunity[] {
  const opportunities: LeaveOpportunity[] = [];

  for (let i = 0; i < clusters.length - 1; i++) {
    const current = clusters[i];
    const next = clusters[i + 1];

    const gapStart = current.endIdx + 1;
    const gapEnd = next.startIdx - 1;

    if (gapStart > gapEnd) {
      continue;
    }

    const gapWorkdays = countWorkdaysInRange(calendar, gapStart, gapEnd);
    if (
      gapWorkdays <= 0 ||
      gapWorkdays > leaveAllowance ||
      gapWorkdays > MAX_BRIDGE_GAP
    ) {
      continue;
    }

    const maxBefore = countConsecutiveWorkdays(
      calendar,
      current.startIdx - 1,
      -1,
      MAX_SIDE_EXTENSION
    );
    const maxAfter = countConsecutiveWorkdays(
      calendar,
      next.endIdx + 1,
      1,
      MAX_SIDE_EXTENSION
    );

    for (
      let before = 0;
      before <= Math.min(maxBefore, leaveAllowance - gapWorkdays);
      before++
    ) {
      for (
        let after = 0;
        after <= Math.min(maxAfter, leaveAllowance - gapWorkdays - before);
        after++
      ) {
        const leaveStartIdx = current.startIdx - before;
        const leaveEndIdx = next.endIdx + after;
        const { breakStartIdx, breakEndIdx } = expandBreakBounds(
          calendar,
          leaveStartIdx,
          leaveEndIdx
        );

        const anchorHolidays = collectHolidayNamesInRange(
          calendar,
          breakStartIdx,
          breakEndIdx,
          holidayNames
        );

        if (anchorHolidays.length < 2) {
          continue;
        }

        const { totalLeaveDays, overlapCount } = evaluateLeaveWindow(
          calendar,
          leaveStartIdx,
          leaveEndIdx,
          mandatoryIndices
        );

        if (totalLeaveDays === 0) {
          continue;
        }

        const additionalLeaveNeeded = Math.max(
          0,
          totalLeaveDays - overlapCount
        );

        if (additionalLeaveNeeded > remainingAllowance) {
          continue;
        }

        const breakLength = breakEndIdx - breakStartIdx + 1;
        const efficiency =
          additionalLeaveNeeded > 0
            ? breakLength / additionalLeaveNeeded
            : breakLength;

        if (breakLength < 5 || efficiency < 2) {
          continue;
        }

        const holidaySummary = summariseHolidayAnchors(anchorHolidays);
        const leaveDaysRequired = totalLeaveDays;

        let description: string;
        if (additionalLeaveNeeded === 0) {
          description = `No extra leave needed - ${breakLength} days off using only must-have dates bridging ${holidaySummary}`;
        } else {
          description = `By booking ${additionalLeaveNeeded} day${additionalLeaveNeeded !== 1 ? "s" : ""} bridging ${holidaySummary}, you get ${breakLength} days off`;
        }

        const hasLeadingLeave = before > 0 || gapWorkdays > 0;
        const hasTrailingLeave = after > 0 || gapWorkdays > 0;

        opportunities.push({
          leaveStartIdx,
          leaveEndIdx,
          breakStartIdx,
          breakEndIdx,
          leaveDaysUsed: additionalLeaveNeeded,
          totalLeaveDays,
          overlapCount,
          breakLength,
          efficiency,
          type: "bridge",
          description,
          anchorHolidays,
          hasLeadingLeave,
          hasTrailingLeave,
        });
      }
    }
  }

  return opportunities;
}

function findStandaloneOpportunities(
  calendar: CalendarDay[],
  maxDays: number,
  mandatoryIndices: Set<number>,
  remainingAllowance: number
): LeaveOpportunity[] {
  const opportunities: LeaveOpportunity[] = [];

  for (let i = 0; i <= calendar.length - 4; i++) {
    const friday = calendar[i];
    if (friday.weekday !== 5 || !friday.isWorkday) {
      continue;
    }

    const saturday = calendar[i + 1];
    const sunday = calendar[i + 2];
    const monday = calendar[i + 3];

    if (!saturday || !sunday || !monday) {
      continue;
    }

    if (
      saturday.weekday !== 6 ||
      sunday.weekday !== 0 ||
      monday.weekday !== 1
    ) {
      continue;
    }

    if (!monday.isWorkday) {
      continue;
    }

    const fridayRange = expandBreakBounds(calendar, i, i + 2);
    const fridayTotal = fridayRange.breakEndIdx - fridayRange.breakStartIdx + 1;
    const fridayStats = evaluateLeaveWindow(calendar, i, i, mandatoryIndices);
    const fridayAdditional = Math.max(
      0,
      fridayStats.totalLeaveDays - fridayStats.overlapCount
    );

    if (
      fridayStats.totalLeaveDays > 0 &&
      fridayAdditional <= remainingAllowance
    ) {
      const fridayEfficiency =
        fridayAdditional > 0 ? fridayTotal / fridayAdditional : fridayTotal;
      const fridayDescription =
        fridayAdditional === 0
          ? `No extra leave needed - ${fridayTotal} days off using only must-have Friday`
          : `By booking Friday off, you get ${fridayTotal} days off (${fridayAdditional} day of leave for ${fridayTotal - fridayAdditional} free days)`;

      opportunities.push({
        leaveStartIdx: i,
        leaveEndIdx: i,
        breakStartIdx: fridayRange.breakStartIdx,
        breakEndIdx: fridayRange.breakEndIdx,
        leaveDaysUsed: fridayAdditional,
        totalLeaveDays: fridayStats.totalLeaveDays,
        overlapCount: fridayStats.overlapCount,
        breakLength: fridayTotal,
        efficiency: fridayEfficiency,
        type: "standalone",
        description: fridayDescription,
        anchorHolidays: [],
        hasLeadingLeave: true,
        hasTrailingLeave: false,
      });
    }

    const mondayRange = expandBreakBounds(calendar, i + 1, i + 3);
    const mondayTotal = mondayRange.breakEndIdx - mondayRange.breakStartIdx + 1;
    const mondayStats = evaluateLeaveWindow(
      calendar,
      i + 3,
      i + 3,
      mandatoryIndices
    );
    const mondayAdditional = Math.max(
      0,
      mondayStats.totalLeaveDays - mondayStats.overlapCount
    );

    if (
      mondayStats.totalLeaveDays > 0 &&
      mondayAdditional <= remainingAllowance
    ) {
      const mondayEfficiency =
        mondayAdditional > 0 ? mondayTotal / mondayAdditional : mondayTotal;
      const mondayDescription =
        mondayAdditional === 0
          ? `No extra leave needed - ${mondayTotal} days off using only must-have Monday`
          : `By booking Monday off, you get ${mondayTotal} days off (${mondayAdditional} day of leave for ${mondayTotal - mondayAdditional} free days)`;

      opportunities.push({
        leaveStartIdx: i + 3,
        leaveEndIdx: i + 3,
        breakStartIdx: mondayRange.breakStartIdx,
        breakEndIdx: mondayRange.breakEndIdx,
        leaveDaysUsed: mondayAdditional,
        totalLeaveDays: mondayStats.totalLeaveDays,
        overlapCount: mondayStats.overlapCount,
        breakLength: mondayTotal,
        efficiency: mondayEfficiency,
        type: "standalone",
        description: mondayDescription,
        anchorHolidays: [],
        hasLeadingLeave: false,
        hasTrailingLeave: true,
      });
    }

    if (maxDays >= 2) {
      const combinedRange = expandBreakBounds(calendar, i, i + 3);
      const combinedTotal =
        combinedRange.breakEndIdx - combinedRange.breakStartIdx + 1;
      const combinedStats = evaluateLeaveWindow(
        calendar,
        i,
        i + 3,
        mandatoryIndices
      );
      const combinedAdditional = Math.max(
        0,
        combinedStats.totalLeaveDays - combinedStats.overlapCount
      );

      if (
        combinedStats.totalLeaveDays > 0 &&
        combinedAdditional <= remainingAllowance
      ) {
        const combinedEfficiency =
          combinedAdditional > 0
            ? combinedTotal / combinedAdditional
            : combinedTotal;
        const combinedDescription =
          combinedAdditional === 0
            ? `No extra leave needed - ${combinedTotal} days off using only must-have Friday & Monday`
            : `By booking Friday & Monday off, you get ${combinedTotal} days off (${combinedAdditional} days of leave for ${combinedTotal - combinedAdditional} free days)`;

        opportunities.push({
          leaveStartIdx: i,
          leaveEndIdx: i + 3,
          breakStartIdx: combinedRange.breakStartIdx,
          breakEndIdx: combinedRange.breakEndIdx,
          leaveDaysUsed: combinedAdditional,
          totalLeaveDays: combinedStats.totalLeaveDays,
          overlapCount: combinedStats.overlapCount,
          breakLength: combinedTotal,
          efficiency: combinedEfficiency,
          type: "standalone",
          description: combinedDescription,
          anchorHolidays: [],
          hasLeadingLeave: true,
          hasTrailingLeave: true,
        });
      }
    }
  }

  return opportunities;
}

function selectNonOverlappingOpportunities(
  opportunities: LeaveOpportunity[],
  limit: number
): LeaveOpportunity[] {
  const groupMap = new Map<string, Map<number, LeaveOpportunity>>();

  for (const opportunity of opportunities) {
    const anchorKey = buildAnchorKey(opportunity);
    if (!groupMap.has(anchorKey)) {
      groupMap.set(anchorKey, new Map<number, LeaveOpportunity>());
    }

    const variants = groupMap.get(anchorKey)!;
    const existing = variants.get(opportunity.leaveDaysUsed);
    if (!existing || isOpportunityBetter(opportunity, existing)) {
      variants.set(opportunity.leaveDaysUsed, opportunity);
    }
  }

  const groups = Array.from(groupMap.entries()).map(([anchorKey, variants]) => {
    const variantList = Array.from(variants.values()).sort(
      (a, b) => a.leaveDaysUsed - b.leaveDaysUsed
    );
    const bestBreakLength = Math.max(...variantList.map((v) => v.breakLength));
    return { anchorKey, variants: variantList, bestBreakLength };
  });

  groups.sort((a, b) => b.bestBreakLength - a.bestBreakLength);

  const primaryVariants = groups
    .map((group) => ({
      anchorKey: group.anchorKey,
      opportunity: group.variants[0],
    }))
    .filter((entry) => entry.opportunity !== undefined) as Array<{
    anchorKey: string;
    opportunity: LeaveOpportunity;
  }>;

  const secondaryVariants: Array<{
    anchorKey: string;
    opportunity: LeaveOpportunity;
  }> = [];
  for (const group of groups) {
    for (let i = 1; i < group.variants.length; i++) {
      const opportunity = group.variants[i];
      if (!opportunity) {
        continue;
      }
      secondaryVariants.push({ anchorKey: group.anchorKey, opportunity });
    }
  }

  secondaryVariants.sort((a, b) => {
    if (a.opportunity.leaveDaysUsed !== b.opportunity.leaveDaysUsed) {
      return a.opportunity.leaveDaysUsed - b.opportunity.leaveDaysUsed;
    }
    if (b.opportunity.breakLength !== a.opportunity.breakLength) {
      return b.opportunity.breakLength - a.opportunity.breakLength;
    }
    return b.opportunity.efficiency - a.opportunity.efficiency;
  });

  const selected: LeaveOpportunity[] = [];
  const seenVariants = new Set<string>();
  const seenSpan = new Set<string>();

  const primaryQuota = Math.min(Math.ceil(limit / 2), primaryVariants.length);
  for (
    let i = 0;
    i < primaryVariants.length && selected.length < primaryQuota;
    i++
  ) {
    const { anchorKey, opportunity } = primaryVariants[i];
    if (!opportunity) {
      continue;
    }

    const spanKey = `${opportunity.leaveStartIdx}-${opportunity.leaveEndIdx}-${opportunity.breakStartIdx}-${opportunity.breakEndIdx}`;
    const variantKey = `${anchorKey}|${opportunity.leaveDaysUsed}`;

    if (seenSpan.has(spanKey) || seenVariants.has(variantKey)) {
      continue;
    }

    selected.push(opportunity);
    seenSpan.add(spanKey);
    seenVariants.add(variantKey);
  }

  for (const { anchorKey, opportunity } of secondaryVariants) {
    if (selected.length >= limit) {
      break;
    }

    const spanKey = `${opportunity.leaveStartIdx}-${opportunity.leaveEndIdx}-${opportunity.breakStartIdx}-${opportunity.breakEndIdx}`;
    const variantKey = `${anchorKey}|${opportunity.leaveDaysUsed}`;

    if (seenSpan.has(spanKey) || seenVariants.has(variantKey)) {
      continue;
    }

    selected.push(opportunity);
    seenSpan.add(spanKey);
    seenVariants.add(variantKey);
  }

  return selected.slice(0, limit);
}

function isOpportunityBetter(
  candidate: LeaveOpportunity,
  baseline: LeaveOpportunity
): boolean {
  if (candidate.breakLength !== baseline.breakLength) {
    return candidate.breakLength > baseline.breakLength;
  }

  if (Math.abs(candidate.efficiency - baseline.efficiency) > 0.05) {
    return candidate.efficiency > baseline.efficiency;
  }

  const candidateCoverage =
    Number(candidate.hasLeadingLeave) + Number(candidate.hasTrailingLeave);
  const baselineCoverage =
    Number(baseline.hasLeadingLeave) + Number(baseline.hasTrailingLeave);
  if (candidateCoverage !== baselineCoverage) {
    return candidateCoverage > baselineCoverage;
  }

  if (candidate.breakStartIdx !== baseline.breakStartIdx) {
    return candidate.breakStartIdx < baseline.breakStartIdx;
  }

  if (candidate.breakEndIdx !== baseline.breakEndIdx) {
    return candidate.breakEndIdx > baseline.breakEndIdx;
  }

  return candidate.leaveStartIdx < baseline.leaveStartIdx;
}

function buildAnchorKey(opportunity: LeaveOpportunity): string {
  if (opportunity.anchorHolidays.length > 0) {
    return opportunity.anchorHolidays.slice().sort().join("|");
  }

  return `${opportunity.type}-${opportunity.breakStartIdx}-${opportunity.breakEndIdx}`;
}

async function getHolidayNames(
  region: string = "england-and-wales"
): Promise<Array<{ title: string; date: string }>> {
  try {
    const res = await fetch("https://www.gov.uk/bank-holidays.json");
    if (!res.ok) {
      return [];
    }

    const data: any = await res.json();
    const events = data[region]?.events || [];

    return events.map((event: any) => ({
      title: event.title,
      date: event.date,
    }));
  } catch {
    return [];
  }
}

function countConsecutiveWorkdays(
  calendar: CalendarDay[],
  startIdx: number,
  step: -1 | 1,
  cap: number
): number {
  let count = 0;
  let idx = startIdx;

  while (idx >= 0 && idx < calendar.length && count < cap) {
    if (!calendar[idx].isWorkday) {
      break;
    }

    count++;
    idx += step;
  }

  return count;
}

function countWorkdaysInRange(
  calendar: CalendarDay[],
  startIdx: number,
  endIdx: number
): number {
  let count = 0;
  for (let idx = startIdx; idx <= endIdx; idx++) {
    if (calendar[idx].isWorkday) {
      count++;
    }
  }
  return count;
}

function expandBreakBounds(
  calendar: CalendarDay[],
  startIdx: number,
  endIdx: number
): { breakStartIdx: number; breakEndIdx: number } {
  let breakStartIdx = Math.max(0, startIdx);
  let breakEndIdx = Math.min(calendar.length - 1, endIdx);

  while (breakStartIdx > 0 && !calendar[breakStartIdx - 1].isWorkday) {
    breakStartIdx--;
  }

  while (
    breakEndIdx < calendar.length - 1 &&
    !calendar[breakEndIdx + 1].isWorkday
  ) {
    breakEndIdx++;
  }

  return { breakStartIdx, breakEndIdx };
}

function collectHolidayNamesInRange(
  calendar: CalendarDay[],
  startIdx: number,
  endIdx: number,
  holidayNames: Map<string, string>
): string[] {
  const names: string[] = [];
  for (let idx = startIdx; idx <= endIdx; idx++) {
    if (calendar[idx].isHoliday) {
      const name = holidayNames.get(calendar[idx].date.format("YYYY-MM-DD"));
      if (name && !names.includes(name)) {
        names.push(name);
      }
    }
  }
  return names;
}

function summariseHolidayAnchors(names: string[]): string {
  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} & ${names[1]}`;
  }

  return names.join(" + ");
}
