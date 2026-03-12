import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PageTransition } from "@/components/PageTransition";

const mozillaHeadline = localFont({
  src: [
    {
      path: "../assets/fonts/mozilla-headline/MozillaHeadline-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/mozilla-headline/MozillaHeadline-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-mozilla-headline",
});

const mozillaText = localFont({
  src: [
    {
      path: "../assets/fonts/mozilla-text/MozillaText-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/mozilla-text/MozillaText-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-mozilla-text",
});

export const metadata: Metadata = {
  title: "maxmyleave | home",
  description: "a tool to help you get the most out of your annual leave",
  openGraph: {
    title: "maxmyleave | home",
    description: "a tool to help you get the most out of your annual leave",
    url: "https://maxmyleave.com",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${mozillaHeadline.variable} ${mozillaText.variable} antialiased`}
      >
        <Header />
        <PageTransition>{children}</PageTransition>
        <Footer />
      </body>
    </html>
  );
}
