import dayjs, { Dayjs } from "dayjs";

interface HolidayEvent {
  title: string;
  date: string;
  notes: string;
  bunting: boolean;
}

interface BankHolidaysResponse {
  [region: string]: {
    division: string;
    events: HolidayEvent[];
  };
}

export async function getBankHolidays(
  region = "england-and-wales"
): Promise<Dayjs[]> {
  const res = await fetch("https://www.gov.uk/bank-holidays.json");

  if (!res.ok) {
    throw new Error(`Failed to fetch bank holidays: ${res.statusText}`);
  }

  const data: BankHolidaysResponse = await res.json();
  const events = data[region].events;

  return events.map((e) => dayjs(e.date));
}
