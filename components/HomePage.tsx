"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthPanel } from "@/components/AuthPanel";
import { playfairDisplay, plusJakartaSans } from "@/lib/fonts";

const captures = [
  {
    text: "Dad wants the insurance document before Friday.",
    time: "2m ago",
  },
  {
    text: "Need to call the builder back - repair quote.",
    time: "1h ago",
  },
  {
    text: "Idea: recall-first memory app, not another notes tool.",
    time: "3h ago",
  },
];

const principles = [
  {
    number: "01",
    title: "Capture without organizing",
    body:
      "Save the raw fragment now. Structure can wait forever, because retrieval does the heavy lifting. You should not need a system to remember your life.",
  },
  {
    number: "02",
    title: "Recall by meaning, not words",
    body:
      "You do not need the exact words you typed. Ask what mom wanted and Engram finds entries about family requests through semantic search, not keyword matching.",
  },
  {
    number: "03",
    title: "Show the receipts",
    body:
      "Every answer comes with the original entries that produced it. You can trace any synthesis back to your own words.",
  },
];

const exampleQueries = [
  {
    code: "WK",
    title: "What has my manager asked me to follow up on?",
    category: "Work",
  },
  {
    code: "ID",
    title: "What product ideas keep repeating in my notes?",
    category: "Ideas",
  },
  {
    code: "FM",
    title: "What did mom ask me to do this month?",
    category: "Family",
  },
  {
    code: "CM",
    title: "What professional commitments am I sitting on?",
    category: "Commitments",
  },
];

export function HomePage({
  isAuthenticated,
  openAuthOnLoad,
}: {
  isAuthenticated: boolean;
  openAuthOnLoad: boolean;
}) {
  const [isAuthOpen, setIsAuthOpen] = useState(
    !isAuthenticated && openAuthOnLoad,
  );

  useEffect(() => {
    if (!isAuthOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAuthOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAuthOpen]);

  return (
    <main
      className={`${plusJakartaSans.className} landing-page relative min-h-[100dvh] overflow-hidden text-[#1c1917]`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="landing-orb landing-orb-left" />
        <div className="landing-orb landing-orb-right" />
      </div>

      <nav className="relative mx-auto flex w-full max-w-[1320px] items-center justify-between px-6 py-5 md:px-14">
        <div className="flex items-center gap-3">
          <div
            className={`${playfairDisplay.className} flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#d4714e] text-base font-extrabold text-white`}
          >
            E
          </div>
          <span className="text-[19px] font-bold text-[#1c1917]">Engram</span>
        </div>

        <div className="flex items-center gap-4 md:gap-7">
          <a
            className="hidden text-sm font-medium text-[#92857a] transition hover:text-[#1c1917] md:inline"
            href="#principles"
          >
            How it works
          </a>
          <a
            className="hidden text-sm font-medium text-[#92857a] transition hover:text-[#1c1917] md:inline"
            href="#examples"
          >
            Examples
          </a>
          {isAuthenticated ? (
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[#d4714e] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b85a3a]"
              href="/memory"
            >
              Start remembering
            </Link>
          ) : (
            <button
              className="inline-flex items-center justify-center rounded-full bg-[#d4714e] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b85a3a]"
              onClick={() => setIsAuthOpen(true)}
              type="button"
            >
              Start remembering
            </button>
          )}
        </div>
      </nav>

      <section className="relative mx-auto grid min-h-[72vh] w-full max-w-[1320px] gap-12 px-6 pb-4 pt-10 md:px-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-20">
        <div className="max-w-[560px] pt-4 lg:pt-10">
          <div className="inline-flex items-center text-[13px] font-semibold tracking-[0.04em] text-[#d4714e]">
            Personal memory layer
          </div>

          <h1
            className={`${playfairDisplay.className} mt-7 text-5xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[#1c1917] sm:text-6xl lg:text-[64px]`}
          >
            Every thought you&apos;ve had.{" "}
            <span className="italic text-[#d4714e]">
              Now ask it a question.
            </span>
          </h1>

          <p className="mt-7 max-w-[440px] text-lg leading-[1.7] text-[#44382e]">
            Engram is where scattered thoughts become answerable questions.
            Capture raw - retrieve smart. No folders, no tags, no friction.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            {isAuthenticated ? (
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[#d4714e] px-9 py-4 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#b85a3a]"
                href="/memory"
              >
                Start remembering
              </Link>
            ) : (
              <button
                className="inline-flex items-center justify-center rounded-full bg-[#d4714e] px-9 py-4 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#b85a3a]"
                onClick={() => setIsAuthOpen(true)}
                type="button"
              >
                Start remembering
              </button>
            )}
            <a
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e8d5c0] px-6 py-4 text-[15px] font-medium text-[#44382e] transition hover:border-[#92857a]"
              href="#principles"
            >
              See how it works
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 16 16"
              >
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="relative pt-2 lg:pt-5">
          <div className="flex flex-col gap-4">
            <div className="rounded-[18px] border border-[#f0e8dc] bg-white p-7 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#d4714e]">
                Capture
              </div>
              <div className="flex flex-col gap-2">
                {captures.map((capture) => (
                  <div
                    className="relative rounded-xl border border-[#f0e8dc] bg-[#faf6f1] px-4 py-[13px] pr-16 text-sm leading-[1.45] text-[#44382e]"
                    key={capture.text}
                  >
                    {capture.text}
                    <span className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[11px] text-[#92857a]">
                      {capture.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex h-8 items-center justify-center text-[#e8d5c0]">
              <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path
                  d="M12 5v14m0 0l-5-5m5 5l5-5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            <div className="rounded-[18px] bg-[#1c1917] p-7 text-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6366f1]">
                Ask your memory
              </div>
              <div className="mb-5 rounded-[10px] border border-white/8 bg-white/7 px-4 py-[13px] text-sm font-medium text-white/85">
                What am I carrying for family this week?
              </div>
              <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7a9b76]">
                Synthesized answer
              </div>
              <div className="rounded-xl border-l-[3px] border-[#7a9b76] bg-white/5 p-[18px]">
                <p className="text-sm leading-[1.65] text-white/80">
                  Three family follow-ups are still open. Book mom&apos;s
                  train before Sunday, call the builder about the repair quote,
                  and send dad the insurance document.
                </p>
                <div className="mt-[14px] flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-white/7 px-2.5 py-1 text-[11px] text-white/45">
                    Family call
                  </span>
                  <span className="rounded-full bg-white/7 px-2.5 py-1 text-[11px] text-white/45">
                    Apr 19 note
                  </span>
                  <span className="rounded-full bg-white/7 px-2.5 py-1 text-[11px] text-white/45">
                    Builder reminder
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-[1320px] px-6 md:px-14">
        <div className="h-px bg-[#f0e8dc]" />
      </section>

      <section
        className="relative mx-auto w-full max-w-[1320px] px-6 py-[72px] md:px-14"
        id="principles"
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end lg:gap-16">
          <h2
            className={`${playfairDisplay.className} max-w-[520px] text-[40px] font-bold leading-[1.1] text-[#1c1917] sm:text-[44px]`}
          >
            Built on three unfashionable ideas
          </h2>
          <p className="max-w-[400px] text-[17px] leading-[1.7] text-[#44382e]">
            Every other tool asks you to organize, categorize, or structure
            your thinking. Engram asks you to just capture - and handles the
            rest.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {principles.map((principle) => (
            <article
              className="rounded-[20px] border border-[#f0e8dc] bg-white px-8 py-10 transition hover:-translate-y-0.5 hover:border-[#e8d5c0] hover:shadow-[0_12px_40px_rgba(212,113,78,0.15)]"
              key={principle.number}
            >
              <div
                className={`${playfairDisplay.className} mb-5 text-[64px] font-extrabold leading-none text-[#f0e8dc]`}
              >
                {principle.number}
              </div>
              <h3 className="text-[20px] font-bold text-[#1c1917]">
                {principle.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.65] text-[#92857a]">
                {principle.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#1c1917] px-6 py-[100px] text-white md:px-14" id="examples">
        <div className="mx-auto max-w-[1320px]">
          <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#d4714e]">
            Things you can ask
          </div>
          <h2
            className={`${playfairDisplay.className} mt-4 max-w-[500px] text-[40px] font-bold leading-[1.1] sm:text-[44px]`}
          >
            Your life, answerable in plain English.
          </h2>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            {exampleQueries.map((query) => (
              <div
                className="flex items-center gap-4 rounded-[14px] border border-white/6 bg-[#292524] px-7 py-6 transition hover:border-[#d4714e]/30 hover:bg-[#332923]"
                key={query.title}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white/6 text-xs font-semibold text-white/80">
                  {query.code}
                </div>
                <div>
                  <div className="text-[15px] font-medium leading-[1.4] text-white/80">
                    {query.title}
                  </div>
                  <div className="mt-1 text-[11px] text-white/35">
                    {query.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-[1320px] px-6 py-[120px] text-center md:px-14">
        <h2
          className={`${playfairDisplay.className} text-[42px] font-bold leading-[1.1] text-[#1c1917] sm:text-[52px]`}
        >
          Stop organizing.
          <br />
          Start <span className="italic text-[#d4714e]">remembering.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[440px] text-lg leading-[1.65] text-[#92857a]">
          One field to capture. One field to ask. That&apos;s the whole
          product.
        </p>
        {isAuthenticated ? (
          <Link
            className="mt-10 inline-flex items-center justify-center rounded-full bg-[#d4714e] px-11 py-4 text-base font-semibold text-white transition hover:bg-[#b85a3a]"
            href="/memory"
          >
            Try Engram
          </Link>
        ) : (
          <button
            className="mt-10 inline-flex items-center justify-center rounded-full bg-[#d4714e] px-11 py-4 text-base font-semibold text-white transition hover:bg-[#b85a3a]"
            onClick={() => setIsAuthOpen(true)}
            type="button"
          >
            Try Engram
          </button>
        )}
      </section>

      <footer className="relative mx-auto flex w-full max-w-[1320px] flex-col gap-2 border-t border-[#f0e8dc] px-6 py-8 text-[13px] text-[#92857a] md:flex-row md:items-center md:justify-between md:px-14">
        <span>Engram 2026</span>
      </footer>

      {isAuthOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(28,25,23,0.22)] backdrop-blur-md"
          onClick={() => setIsAuthOpen(false)}
          role="dialog"
        >
          <div
            className="flex w-full max-w-[32rem] translate-y-0 flex-col p-4 transition-transform duration-300 ease-out sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex justify-end">
              <button
                aria-label="Close sign-in panel"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white/70 text-[#44382e] shadow-[0_10px_30px_rgba(42,31,18,0.08)] transition hover:bg-white"
                onClick={() => setIsAuthOpen(false)}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            </div>
            <div className="rounded-[2.8rem] bg-[rgba(255,245,233,0.34)] p-1 shadow-[0_24px_80px_rgba(35,25,14,0.1)]">
              <AuthPanel />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
