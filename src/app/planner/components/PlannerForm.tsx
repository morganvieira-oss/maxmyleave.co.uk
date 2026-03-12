"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  useActionState,
} from "react";

import MustHaveDatesCard from "./MustHaveDatesCard";
import PlannerResults from "./PlannerResults";
import type { LeaveResult, PlannerSummary } from "../types";
import type { PlannerResult } from "../actions";
import { TransitionLink } from "@/utils/TransitionLink";

interface PlannerFormProps {
  calculateLeaveAction: (formData: FormData) => Promise<PlannerResult>;
  initialResult: PlannerResult | null;
}

interface FormState {
  annualLeaveDays: string;
  country: string;
  year: string;
}

export default function PlannerForm({
  calculateLeaveAction,
  initialResult,
}: PlannerFormProps) {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const [planningYearOptions, setPlanningYearOptions] = useState<number[]>([]);
  const [formData, setFormData] = useState<FormState>({
    annualLeaveDays: "",
    country: "",
    year: String(nextYear),
  });

  const [mustHaveDates, setMustHaveDates] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(
    async (prevState: PlannerResult, formData: FormData) => {
      // Add must-have dates to the form data
      mustHaveDates.forEach((date, index) => {
        formData.append(`mustHaveDate_${index}`, date);
      });
      return await calculateLeaveAction(formData);
    },
    initialResult || { success: false }
  );

  const planningYearNumber = useMemo(
    () => Number(formData.year) || nextYear,
    [formData.year, nextYear]
  );

  useEffect(() => {
    let isMounted = true;

    const loadPlanningYears = async () => {
      try {
        const response = await fetch("https://www.gov.uk/bank-holidays.json");
        const data = (await response.json()) as Record<
          string,
          { events?: Array<{ date: string }> }
        >;
        const events = data["england-and-wales"]?.events ?? [];

        const extractedYears = Array.from(
          new Set(
            events
              .map((event) => Number(event.date.split("-")[0]))
              .filter((year) => !Number.isNaN(year))
          )
        ) as number[];

        const filtered = extractedYears
          .filter((year) => year >= currentYear)
          .sort((a, b) => a - b);

        const usableYears =
          filtered.length > 0 ? filtered : [currentYear, nextYear];

        if (!isMounted) {
          return;
        }

        setPlanningYearOptions(usableYears);

        const defaultYear = usableYears.includes(nextYear)
          ? nextYear
          : usableYears[0];
        setFormData((prev) => ({
          ...prev,
          year: String(defaultYear),
        }));
      } catch (fetchError) {
        console.error("Failed to load bank holiday years", fetchError);
        if (!isMounted) {
          return;
        }
        const fallbackYears = [currentYear, nextYear];
        setPlanningYearOptions(fallbackYears);
        setFormData((prev) => ({
          ...prev,
          year: String(nextYear),
        }));
      }
    };

    loadPlanningYears();

    return () => {
      isMounted = false;
    };
  }, [currentYear, nextYear]);

  const formatIso = (date: Date) => {
    const yearValue = date.getFullYear();
    const monthValue = `${date.getMonth() + 1}`.padStart(2, "0");
    const dayValue = `${date.getDate()}`.padStart(2, "0");
    return `${yearValue}-${monthValue}-${dayValue}`;
  };

  const parseToPlanningYearDate = (value: string | undefined): Date | null => {
    if (!value) {
      return null;
    }

    const [, monthStr, dayStr] = value.split("-");
    const monthValue = Number(monthStr) - 1;
    const dayValue = Number(dayStr);

    if (Number.isNaN(monthValue) || Number.isNaN(dayValue)) {
      return null;
    }

    return new Date(planningYearNumber, monthValue, dayValue);
  };

  const handleAddMustHaveRange = (startValue: string, endValue?: string) => {
    const startDate = parseToPlanningYearDate(startValue);
    const endDate = endValue ? parseToPlanningYearDate(endValue) : startDate;

    if (!startDate || !endDate) {
      return;
    }

    const rangeStart = startDate <= endDate ? startDate : endDate;
    const rangeEnd = startDate <= endDate ? endDate : startDate;

    const newDates: string[] = [];
    const cursor = new Date(rangeStart);

    while (cursor <= rangeEnd) {
      newDates.push(formatIso(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const merged = new Set([...mustHaveDates, ...newDates]);
    const updated = Array.from(merged).sort();

    setMustHaveDates(updated);
  };

  const handleRemoveMustHaveDate = (date: string) => {
    setMustHaveDates((prev) => prev.filter((item) => item !== date));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "year") {
      setMustHaveDates([]);
    }
  };

  const annualLeaveDays = Number(formData.annualLeaveDays || 0);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 px-4 sm:px-0 md:space-y-12">
      <div
        className="rounded-lg border p-6 transition-all duration-[400ms] sm:p-8"
        style={{ borderColor: "rgb(var(--border))" }}
      >
        <h2 className="text-foreground mb-6 text-xl font-medium lowercase italic transition-colors duration-[400ms] sm:text-2xl">
          tell us about your situation
        </h2>

        <form action={formAction} className="space-y-6 sm:space-y-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="text-foreground mb-2 block text-xs font-medium lowercase italic transition-colors duration-[400ms] sm:text-sm">
                annual leave days
              </label>
              <input
                type="number"
                name="annualLeaveDays"
                placeholder="25"
                min="1"
                max="50"
                required
                value={formData.annualLeaveDays}
                onChange={handleInputChange}
                className="body-text focus:ring-foreground w-full border px-4 py-3 italic transition-all duration-[400ms] focus:ring-2 focus:ring-offset-2 focus:outline-none"
                style={{
                  borderColor: "rgb(var(--border))",
                  backgroundColor: "rgb(var(--background))",
                  color: "rgb(var(--foreground))",
                }}
              />
            </div>

            <div>
              <label className="text-foreground mb-2 block text-xs font-medium lowercase italic transition-colors duration-[400ms] sm:text-sm">
                country/region
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                required
                className="body-text focus:ring-foreground w-full border px-4 py-3 italic transition-all duration-[400ms] focus:ring-2 focus:ring-offset-2 focus:outline-none"
                style={{
                  borderColor: "rgb(var(--border))",
                  backgroundColor: "rgb(var(--background))",
                  color: "rgb(var(--foreground))",
                }}
              >
                <option value="">select your location</option>
                <option value="uk">united kingdom</option>
                <option value="scotland">scotland</option>
                <option value="northern-ireland">northern ireland</option>
              </select>
            </div>
          </div>

          <MustHaveDatesCard
            key={formData.year}
            planningYear={formData.year}
            dates={mustHaveDates}
            disabled={planningYearOptions.length === 0}
            onAddRange={handleAddMustHaveRange}
            onRemoveDate={handleRemoveMustHaveDate}
          />

          <div>
            <label className="text-foreground mb-2 block text-xs font-medium lowercase italic transition-colors duration-[400ms] sm:text-sm">
              planning year
            </label>
            <select
              name="year"
              value={formData.year}
              onChange={handleInputChange}
              className="body-text focus:ring-foreground w-full border px-4 py-3 italic transition-all duration-[400ms] focus:ring-2 focus:ring-offset-2 focus:outline-none sm:w-auto"
              style={{
                borderColor: "rgb(var(--border))",
                backgroundColor: "rgb(var(--background))",
                color: "rgb(var(--foreground))",
              }}
              disabled={planningYearOptions.length === 0}
            >
              {planningYearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground mt-2 text-xs italic transition-colors duration-[400ms]">
              showing years with published uk bank holidays (minimum{" "}
              {currentYear}).
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full cursor-pointer border px-6 py-3 font-medium lowercase italic transition-all duration-[400ms] sm:w-auto sm:px-8"
            style={{
              backgroundColor: "rgb(var(--foreground))",
              color: "rgb(var(--background))",
              borderColor: "transparent",
            }}
            onMouseEnter={(e) => {
              if (!isPending) {
                e.currentTarget.style.backgroundColor =
                  "rgb(var(--muted-foreground))";
                e.currentTarget.style.borderColor =
                  "rgb(var(--muted-foreground))";
              }
            }}
            onMouseLeave={(e) => {
              if (!isPending) {
                e.currentTarget.style.backgroundColor =
                  "rgb(var(--foreground))";
                e.currentTarget.style.borderColor = "transparent";
              }
            }}
          >
            {isPending ? "calculating..." : "calculate optimal dates"}
          </button>
        </form>
      </div>

      <PlannerResults
        loading={isPending}
        error={state.success === false ? state.error || null : null}
        results={state.success ? state.results || [] : []}
        annualLeaveDays={annualLeaveDays}
        planningYear={planningYearNumber}
        summary={state.success ? state.summary || null : null}
      />

      <div
        className="border-t pt-8 text-center transition-all duration-[400ms] sm:pt-12"
        style={{ borderColor: "rgb(var(--border))" }}
      >
        <h2 className="text-foreground mb-4 text-xl font-medium lowercase italic transition-colors duration-[400ms] sm:text-2xl">
          need help?
        </h2>
        <p className="body-text text-muted-foreground mb-6 text-base italic transition-colors duration-[400ms] sm:text-lg">
          not sure how this works or have questions?
        </p>
        <TransitionLink
          href="/faq"
          className="inline-block w-full cursor-pointer border px-6 py-3 text-center font-medium lowercase italic transition-all duration-[400ms] sm:w-auto sm:px-8"
          style={{
            borderColor: "rgb(var(--border))",
            color: "rgb(var(--foreground))",
            backgroundColor: "transparent",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgb(var(--muted))";
            e.currentTarget.style.borderColor = "rgb(var(--foreground))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "rgb(var(--border))";
          }}
        >
          check the faq
        </TransitionLink>
      </div>
    </div>
  );
}
