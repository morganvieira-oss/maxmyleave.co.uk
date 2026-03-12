import { TransitionLink } from "@/utils/TransitionLink";

export function Footer() {
  return (
    <footer
      className="border-t transition-all duration-[400ms]"
      style={{
        backgroundColor: "rgb(var(--surface-soft) / 0.85)",
        borderColor: "rgb(var(--border))",
      }}
    >
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md space-y-3">
            <p
              className="text-sm font-medium tracking-wide lowercase italic transition-colors duration-[400ms]"
              style={{ color: "rgb(var(--foreground))" }}
            >
              maxmyleave
            </p>
            <p
              className="text-sm italic transition-colors duration-[400ms]"
              style={{ color: "rgb(var(--muted-foreground))" }}
            >
              the best damn annual leave planner on the internet.
            </p>
          </div>

          <div className="flex flex-col gap-6 text-sm md:text-right">
            <nav className="flex flex-wrap gap-4 md:justify-end">
              <TransitionLink
                href="/planner"
                className="italic transition-colors duration-[400ms] hover:underline"
                style={{ color: "rgb(var(--foreground))" }}
              >
                planner
              </TransitionLink>
              <TransitionLink
                href="/faq"
                className="italic transition-colors duration-[400ms] hover:underline"
                style={{ color: "rgb(var(--foreground))" }}
              >
                faq
              </TransitionLink>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 text-xs italic md:flex-row md:items-center md:justify-between">
          <span
            className="transition-colors duration-[400ms]"
            style={{ color: "rgb(var(--muted-foreground))" }}
          >
            © 2025 morgan vieira • all rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
