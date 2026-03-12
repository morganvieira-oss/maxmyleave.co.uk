import type { Metadata, Viewport } from "next";
import Image from "next/image";

const faqData: Array<{
  question: string;
  answer: string | React.ReactNode;
  customClass?: string;
}> = [
  {
    question: "what does this site do?",
    answer:
      "this website is meant to be used to maximise the amount of annual leave days you can take from work.",
  },
  {
    question: "why have you made this?",
    answer: "i hate working",
  },
  {
    question: "who are you?",
    answer: (
      <div>
        <p className="mb-2">
          i'm morgan vieira, i build tools and websites to make life easier and
          more enjoyable. i guess you can call me a software developer.
        </p>
        <a
          href="https://linkedin.com/in/morgan-vieira"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 transition-colors duration-[400ms] hover:underline"
          style={{ color: "rgb(var(--foreground))" }}
        >
          connect with me on linkedin →
        </a>
      </div>
    ),
  },
  {
    question: "is this free?",
    answer: "yes",
  },
  {
    question: "what's with the icon?",
    answer: (
      <>
        <span>banana</span>
        <Image src="/orange.png" alt="banana" width={100} height={100} />
      </>
    ),
  },
  {
    question: "how does this actually work?",
    answer:
      "react frontend, nextjs backend, tailwindcss for styling. everything a growing boy needs.",
  },
];

export const metadata: Metadata = {
  title: "maxmyleave | faq",
  description: "frequently asked questions about maxmyleave",
  openGraph: {
    title: "maxmyleave | faq",
    description: "frequently asked questions about maxmyleave",
    url: "https://maxmyleave.com/faq",
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

export default function FAQ() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 px-6 py-20">
      <div className="text-center">
        <h1
          className="mb-4 text-3xl font-medium lowercase italic"
          style={{ color: "rgb(var(--foreground))" }}
        >
          frequently asked questions
        </h1>
        <p
          className="body-text text-lg italic"
          style={{ color: "rgb(var(--muted-foreground))" }}
        >
          everything you need to know about maxmyleave
        </p>
      </div>

      <div
        className="space-y-8 border-t pt-12 transition-all duration-[400ms]"
        style={{ borderColor: "rgb(var(--border))" }}
      >
        {faqData.map((faq, index) => (
          <div
            key={index}
            className={`pb-6 ${index < faqData.length - 1 ? "border-b" : ""}`}
            style={{ borderColor: "rgb(var(--border))" }}
          >
            <h2
              className="mb-3 text-xl font-medium lowercase italic"
              style={{ color: "rgb(var(--foreground))" }}
            >
              {faq.question}
            </h2>
            <div
              className={`body-text leading-relaxed italic ${faq.customClass || ""}`}
              style={{ color: "rgb(var(--muted-foreground))" }}
            >
              {faq.answer}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
