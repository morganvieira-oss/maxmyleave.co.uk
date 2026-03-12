"use client";

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

interface LeaveOptionRowProps {
  result: LeaveResult;
  index: number;
  variants?: LeaveResult[];
  availableAllowance?: number;
  totalAllowance?: number;
  mandatoryLeaveCount?: number;
}

export default function LeaveOptionRow({
  result,
  index,
  variants = [],
  availableAllowance,
  totalAllowance,
  mandatoryLeaveCount = 0,
}: LeaveOptionRowProps) {
  const formatCount = (count: number, noun: string): string =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;
  const formatNumber = (value: number): string => value.toLocaleString("en-GB");

  const overlapSet = new Set(result.overlappingMandatoryDates);
  const sortedVariants = variants.slice().sort((a, b) => {
    if (a.leaveDaysUsed !== b.leaveDaysUsed) {
      return a.leaveDaysUsed - b.leaveDaysUsed;
    }
    if (b.breakLength !== a.breakLength) {
      return b.breakLength - a.breakLength;
    }
    return (
      new Date(a.breakEndDate).getTime() - new Date(b.breakEndDate).getTime()
    );
  });

  const breakRangeLabel = `${new Date(result.breakStartDate).toLocaleDateString("en-GB")} - ${new Date(result.breakEndDate).toLocaleDateString("en-GB")}`;

  const baseAllowance =
    totalAllowance ??
    (availableAllowance !== undefined
      ? availableAllowance + mandatoryLeaveCount
      : undefined);
  const projectedAllowance =
    baseAllowance !== undefined
      ? Math.max(
          baseAllowance - (mandatoryLeaveCount + result.leaveDaysUsed),
          0
        )
      : undefined;

  const hasZeroAdditional = result.leaveDaysUsed === 0;
  const mustHaveCount = result.overlappingMandatoryDates.length;

  const summaryLines: Array<{ label: string; value: string; helper?: string }> =
    [
      {
        label: "Book",
        value: hasZeroAdditional
          ? "No new days"
          : `${formatCount(result.leaveDaysUsed, "day")} of annual leave`,
        helper: hasZeroAdditional
          ? "All covered by your pinned days"
          : "Request this time off to make it happen",
      },
      {
        label: "Time off",
        value: `${formatCount(result.breakLength, "day")} away`,
        helper: `${formatCount(result.freeDays, "free day")} already free`,
      },
      {
        label: "Annual leave within break",
        value: formatCount(result.totalLeaveDays, "day"),
        helper:
          mustHaveCount > 0
            ? `Includes ${formatCount(mustHaveCount, "must-have day")}`
            : "All new leave you would request",
      },
    ];

  if (projectedAllowance !== undefined) {
    summaryLines.push({
      label: "Allowance after booking",
      value: `${formatNumber(projectedAllowance)} day${projectedAllowance === 1 ? "" : "s"} left`,
      helper: "Based on the allowance you entered",
    });
  }

  return (
    <div
      className="rounded-lg border p-4 shadow-sm transition-colors duration-[400ms]"
      style={{
        backgroundColor: "rgb(var(--surface) / 0.9)",
        borderColor: "rgb(var(--border))",
        boxShadow: "0 12px 32px rgb(var(--foreground) / 0.05)",
      }}
    >
      <div className="text-muted-foreground text-xs tracking-wide uppercase">
        Break {index + 1}
      </div>
      <div className="text-foreground text-base font-semibold transition-colors duration-[400ms]">
        {breakRangeLabel}
      </div>

      <div className="text-muted-foreground mt-2 text-sm transition-colors duration-[400ms]">
        {result.description}
      </div>

      <dl className="text-muted-foreground mt-4 grid gap-2 text-sm transition-colors duration-[400ms] sm:grid-cols-2">
        {summaryLines.map((line) => (
          <div
            key={line.label}
            className="flex flex-col gap-0.5 rounded border p-3 transition-colors duration-[400ms]"
            style={{
              backgroundColor: "rgb(var(--surface-soft) / 0.9)",
              borderColor: "rgb(var(--border) / 0.7)",
            }}
          >
            <dt className="text-muted-foreground text-xs tracking-wide uppercase">
              {line.label}
            </dt>
            <dd className="text-foreground text-base font-semibold transition-colors duration-[400ms]">
              {line.value}
            </dd>
            {line.helper && (
              <span className="text-muted-foreground text-xs">
                {line.helper}
              </span>
            )}
          </div>
        ))}
      </dl>

      {result.overlappingMandatoryDates.length > 0 && (
        <div
          className="mt-3 rounded-md border p-3 text-sm"
          style={{
            borderColor: "rgb(var(--calendar-nonworking) / 0.6)",
            backgroundColor: "rgb(var(--calendar-nonworking) / 0.35)",
            color: "rgb(var(--calendar-nonworking-text))",
          }}
        >
          📌 Covers your must-have days:{" "}
          {result.overlappingMandatoryDates
            .map((date) =>
              new Date(date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })
            )
            .join(", ")}
        </div>
      )}

      {sortedVariants.length > 0 && (
        <div
          className="mt-4 space-y-1 rounded-md border p-3 text-sm"
          style={{
            borderColor: "rgb(var(--calendar-break) / 0.6)",
            backgroundColor: "rgb(var(--calendar-break) / 0.35)",
            color: "rgb(var(--calendar-break-text))",
          }}
        >
          <div className="font-medium">Other ways to stretch it</div>
          {sortedVariants.map((variant, variantIndex) => {
            const variantOverlap = new Set(variant.overlappingMandatoryDates);
            const variantAdditional = variant.leaveDates.filter(
              (date) => !variantOverlap.has(date)
            );
            const variantSummary =
              variantAdditional.length > 0
                ? `${variantAdditional.map((date) => new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })).join(", ")} to request`
                : "No extra days beyond your must-have list";

            return (
              <div
                key={`${variant.breakStartDate}-${variant.breakEndDate}-${variantIndex}`}
              >
                Book {formatCount(variant.leaveDaysUsed, "day")} → enjoy{" "}
                {formatCount(variant.breakLength, "day")}. {variantSummary}.
              </div>
            );
          })}
        </div>
      )}

      <div
        className="mt-4 rounded-md p-3 text-sm transition-colors duration-[400ms]"
        style={{
          backgroundColor: "rgb(var(--surface-soft) / 0.8)",
          color: "rgb(var(--foreground))",
        }}
      >
        With {formatCount(result.leaveDaysUsed, "day")} booked, you can take{" "}
        {formatCount(result.breakLength, "day")} off.
      </div>
    </div>
  );
}
