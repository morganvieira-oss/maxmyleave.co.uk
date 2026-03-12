import PlannerForm from "./components/PlannerForm";
import { calculateLeaveAction, type PlannerResult } from "./actions";

interface PlannerPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Planner({ searchParams }: PlannerPageProps) {
  let plannerResult: PlannerResult | null = null;

  const params = await searchParams;

  if (params.submitted === "true") {
    try {
      plannerResult = null;
    } catch (error) {
      console.error("Error processing results:", error);
    }
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-foreground mb-4 text-4xl font-bold lowercase italic transition-colors duration-[400ms] md:text-5xl">
            annual leave planner
          </h1>
          <p className="body-text text-muted-foreground mx-auto max-w-2xl text-lg italic transition-colors duration-[400ms] md:text-xl">
            let's figure out how to maximize your time off
          </p>
        </div>

        <PlannerForm
          calculateLeaveAction={calculateLeaveAction}
          initialResult={plannerResult}
        />
      </div>
    </main>
  );
}
