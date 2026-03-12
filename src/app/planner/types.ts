export interface LeaveResult {
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

export interface PlannerSummary {
  mandatory: string[];
  nonWorking: string[];
  ignored: string[];
  remainingAllowance: number;
  overbooked: boolean;
}
