"use client";

import { useState } from "react";

type AddRangeHandler = (start: string, end?: string) => void;

type RemoveHandler = (date: string) => void;

interface MustHaveDatesCardProps {
  planningYear: string;
  dates: string[];
  disabled: boolean;
  onAddRange: AddRangeHandler;
  onRemoveDate: RemoveHandler;
}

const dayOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
};

export default function MustHaveDatesCard({
  planningYear,
  dates,
  disabled,
  onAddRange,
  onRemoveDate,
}: MustHaveDatesCardProps) {
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");

  const handleAdd = () => {
    if (!startInput) {
      return;
    }

    onAddRange(startInput, endInput || undefined);
    setStartInput("");
    setEndInput("");
  };

  return (
    <div
      className="border p-4 transition-all duration-[400ms] sm:p-6"
      style={{
        borderColor: "rgb(var(--border))",
        backgroundColor: "rgb(var(--muted))",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-foreground text-sm font-medium lowercase italic transition-colors duration-[400ms]">
            must-have dates
          </h3>
          <p className="text-muted-foreground mt-1 text-sm italic transition-colors duration-[400ms]">
            ring-fence the days you already need off. we will prioritise these
            when building your plan.
          </p>
        </div>
        {dates.length > 0 && (
          <span
            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium italic transition-all duration-[400ms]"
            style={{
              borderColor: "rgb(var(--border))",
              color: "rgb(var(--foreground))",
              backgroundColor: "rgb(var(--background))",
            }}
          >
            {dates.length} pinned day{dates.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs tracking-wide uppercase transition-colors duration-[400ms]">
            start date
          </span>
          <input
            type="date"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            min={`${planningYear}-01-01`}
            max={`${planningYear}-12-31`}
            className="body-text focus:ring-foreground box-border w-full max-w-full min-w-0 appearance-none rounded border px-4 py-3.5 text-base italic transition-all duration-[400ms] focus:ring-2 focus:ring-offset-2 focus:outline-none"
            style={{
              borderColor: "rgb(var(--border))",
              backgroundColor: "rgb(var(--background))",
              color: "rgb(var(--foreground))",
              width: "100%",
              minWidth: 0,
              fontSize: "16px",
            }}
            disabled={disabled}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs tracking-wide uppercase transition-colors duration-[400ms]">
            end date (optional)
          </span>
          <input
            type="date"
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
            min={`${planningYear}-01-01`}
            max={`${planningYear}-12-31`}
            className="body-text focus:ring-foreground box-border w-full max-w-full min-w-0 appearance-none rounded border px-4 py-3.5 text-base italic transition-all duration-[400ms] focus:ring-2 focus:ring-offset-2 focus:outline-none"
            style={{
              borderColor: "rgb(var(--border))",
              backgroundColor: "rgb(var(--background))",
              color: "rgb(var(--foreground))",
              width: "100%",
              minWidth: 0,
              fontSize: "16px",
            }}
            disabled={disabled}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleAdd}
            className="w-full cursor-pointer border px-4 py-3.5 text-base font-medium lowercase italic transition-all duration-[400ms]"
            style={{
              backgroundColor: "rgb(var(--foreground))",
              color: "rgb(var(--background))",
              borderColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgb(var(--muted-foreground))";
              e.currentTarget.style.borderColor =
                "rgb(var(--muted-foreground))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgb(var(--foreground))";
              e.currentTarget.style.borderColor = "transparent";
            }}
            disabled={disabled}
          >
            add dates
          </button>
        </div>
      </div>

      <p className="text-muted-foreground mt-3 text-xs italic transition-colors duration-[400ms]">
        select a start date and, if you need a block, an end date. we will
        reserve every day in that span before maximising your remaining
        allowance.
      </p>

      {dates.length > 0 && (
        <div className="mt-4">
          <div className="text-muted-foreground mb-2 text-xs tracking-wide uppercase transition-colors duration-[400ms]">
            pinned days
          </div>
          <div className="flex flex-wrap gap-2">
            {dates.map((date) => (
              <span
                key={date}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm italic transition-all duration-[400ms]"
                style={{
                  borderColor: "rgb(var(--border))",
                  backgroundColor: "rgb(var(--background))",
                  color: "rgb(var(--foreground))",
                }}
              >
                {new Date(date).toLocaleDateString("en-GB", dayOptions)}
                <button
                  type="button"
                  onClick={() => onRemoveDate(date)}
                  className="text-xs tracking-wide uppercase"
                  style={{ color: "rgb(var(--muted-foreground))" }}
                >
                  remove
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
