import { NextRequest, NextResponse } from "next/server";
import { maximiseDaysOff } from "@/lib/maximiseDaysOff";

interface RequestBody {
  annualLeaveDays: string;
  country: string;
  year: string;
  mustHaveDates?: string[];
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function rateLimit(request: NextRequest): boolean {
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();

  const userRecord = rateLimitMap.get(ip);

  if (!userRecord || now > userRecord.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userRecord.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userRecord.count++;
  return true;
}

export async function POST(request: NextRequest) {
  if (!rateLimit(request)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body: RequestBody = await request.json();
    const { annualLeaveDays, country, year, mustHaveDates } = body;

    if (!annualLeaveDays || !country || !year) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const leaveDays = parseInt(annualLeaveDays);
    const planningYear = parseInt(year);

    if (isNaN(leaveDays) || leaveDays < 1 || leaveDays > 50) {
      return NextResponse.json(
        { error: "Annual leave days must be between 1 and 50" },
        { status: 400 }
      );
    }

    let region = "england-and-wales";
    if (country === "uk") {
      region = "england-and-wales";
    } else if (country === "scotland") {
      region = "scotland";
    } else if (country === "northern-ireland") {
      region = "northern-ireland";
    }

    const requiredLeaveDates = Array.isArray(mustHaveDates)
      ? mustHaveDates.filter(
          (value): value is string => typeof value === "string"
        )
      : [];

    const plan = await maximiseDaysOff(
      leaveDays,
      planningYear,
      region,
      5,
      requiredLeaveDates
    );

    return NextResponse.json({
      results: plan.options,
      mandatoryLeaveDates: plan.mandatoryLeaveDates,
      nonWorkingMandatoryDates: plan.nonWorkingMandatoryDates,
      ignoredMandatoryDates: plan.ignoredMandatoryDates,
      remainingAllowance: plan.remainingAllowance,
      overbooked: plan.overbooked,
    });
  } catch (error) {
    console.error("Error calculating leave:", error);
    return NextResponse.json(
      { error: "Failed to calculate optimal leave dates" },
      { status: 500 }
    );
  }
}
