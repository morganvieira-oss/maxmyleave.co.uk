import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "maxmyleave | planner",
  description: "plan your annual leave to maximise time off",

  openGraph: {
    title: "maxmyleave | planner",
    description: "plan your annual leave to maximise time off",
    url: "https://maxmyleave.com/planner",
    siteName: "maxmyleave",
    locale: "en_GB",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
