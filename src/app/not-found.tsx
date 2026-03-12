import type { Metadata } from "next";
import { TransitionLink } from "@/utils/TransitionLink";

export const metadata: Metadata = {
  title: "404 | maxmyleave",
  description: "page not found",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="max-w-2xl text-center">
        <h1 className="text-foreground mb-6 text-6xl font-bold lowercase italic transition-colors duration-[400ms] md:text-8xl">
          404
        </h1>
        <h2 className="text-foreground mb-4 text-3xl font-medium lowercase italic transition-colors duration-[400ms] md:text-4xl">
          page not found
        </h2>
        <p className="body-text text-muted-foreground mb-8 text-xl italic transition-colors duration-[400ms] md:text-2xl">
          whatever you're looking for isn't here
        </p>
        <div className="space-y-4 md:flex md:justify-center md:space-y-0 md:space-x-4">
          <TransitionLink
            href="/"
            className="inline-block cursor-pointer border px-8 py-3 font-medium lowercase italic transition-all duration-[400ms]"
            style={{
              backgroundColor: "rgb(var(--foreground))",
              color: "rgb(var(--background))",
              borderColor: "transparent",
              textDecoration: "none",
            }}
          >
            go home
          </TransitionLink>
          <TransitionLink
            href="/faq"
            className="inline-block cursor-pointer border px-8 py-3 font-medium lowercase italic transition-all duration-[400ms]"
            style={{
              borderColor: "rgb(var(--border))",
              color: "rgb(var(--foreground))",
              backgroundColor: "transparent",
              textDecoration: "none",
            }}
          >
            frequently asked questions
          </TransitionLink>
        </div>
      </div>
    </main>
  );
}
