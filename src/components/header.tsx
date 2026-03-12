import { TransitionLink } from "@/utils/TransitionLink";
import Link from "next/link";

export function Header() {
  return (
    <header className="border-b transition-all duration-[400ms]">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center md:justify-start">
          <TransitionLink href="/" className="group flex items-center gap-3">
            <span className="text-foreground text-2xl font-medium lowercase italic transition-colors duration-[400ms] hover:underline">
              maxmyleave
            </span>
          </TransitionLink>
        </div>
      </div>
    </header>
  );
}
