"use server";

import { redirect } from "next/navigation";
import { maximiseDaysOff } from "@/lib/maximiseDaysOff";
import type { LeaveResult, PlannerSummary } from "./types";

export interface PlannerFormData {
  annualLeaveDays: string;
  country: string;
  year: string;
  mustHaveDates: string[];
}

export interface PlannerResult {
  success: boolean;
  results?: LeaveResult[];
  summary?: PlannerSummary;
  error?: string;
}

export async function calculateLeaveAction(
  formData: FormData
): Promise<PlannerResult> {
  try {
    // Extract form data
    const annualLeaveDays = formData.get("annualLeaveDays") as string;
    const country = formData.get("country") as string;
    const year = formData.get("year") as string;

    // Extract must-have dates (they come as multiple form fields)
    const mustHaveDates: string[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("mustHaveDate_") && typeof value === "string") {
        mustHaveDates.push(value);
      }
    }

    // Validate inputs
    if (!annualLeaveDays || !country || !year) {
      return {
        success: false,
        error: "Missing required fields",
      };
    }

    const leaveDays = parseInt(annualLeaveDays);
    const planningYear = parseInt(year);

    if (isNaN(leaveDays) || leaveDays < 1 || leaveDays > 50) {
      return {
        success: false,
        error: "Annual leave days must be between 1 and 50",
      };
    }

    // Map country to region for the holidays API
    let region = "england-and-wales";
    if (country === "uk") {
      region = "england-and-wales";
    }
    // Add more countries/regions as needed

    const requiredLeaveDates = mustHaveDates.filter(
      (value): value is string => typeof value === "string"
    );

    // Calculate optimal leave dates
    const plan = await maximiseDaysOff(
      leaveDays,
      planningYear,
      region,
      5,
      requiredLeaveDates
    );

    return {
      success: true,
      results: plan.options,
      summary: {
        mandatory: plan.mandatoryLeaveDates,
        nonWorking: plan.nonWorkingMandatoryDates,
        ignored: plan.ignoredMandatoryDates,
        remainingAllowance: plan.remainingAllowance,
        overbooked: plan.overbooked,
      },
    };
  } catch (error) {
    console.error("Error calculating leave:", error);
    return {
      success: false,
      error: "Failed to calculate optimal leave dates",
    };
  }
}
