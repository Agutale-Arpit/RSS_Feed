"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
import type { FeedItem } from "@/lib/rss";

const publishedDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatPublishedDate(publishedAt: string): string {
  const timestamp = Date.parse(publishedAt);

  if (Number.isNaN(timestamp)) {
    return publishedAt;
  }

  return publishedDateFormatter.format(timestamp);
}

export default function Home() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const loadFeed = useEffectEvent(async (signal: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/feed", {
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const responseBody: unknown = await response.json();

      if (!Array.isArray(responseBody)) {
        throw new Error("Feed response is not an array.");
      }

      if (signal.aborted) {
        return;
      }

      startTransition(() => {
        setItems(responseBody as FeedItem[]);
      });
    } catch (error) {
      if (signal.aborted) {
        return;
      }

      setItems([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load the feed.",
      );
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  });

  useEffect(() => {
    const controller = new AbortController();

    void loadFeed(controller.signal);

    return () => {
      controller.abort();
    };
  }, [requestVersion]);

  return (
    <main className="min-h-screen px-6 py-14 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">
            OpenAI RSS Feed
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Latest feed items
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Articles are loaded from the local API route at
                <span className="mx-2 rounded-full bg-slate-100 px-3 py-1 font-mono text-slate-700">
                  /api/feed
                </span>
                and linked to their original source.
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              onClick={() => {
                startTransition(() => {
                  setRequestVersion((currentValue) => currentValue + 1);
                });
              }}
              type="button"
            >
              Refresh feed
            </button>
          </div>
        </section>

        {isLoading ? (
          <section className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
            <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </section>
        ) : null}

        {!isLoading && errorMessage ? (
          <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-red-900 shadow-[0_18px_50px_rgba(127,29,29,0.08)]">
            <h2 className="text-lg font-semibold">Unable to load feed items</h2>
            <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
          </section>
        ) : null}

        {!isLoading && !errorMessage ? (
          <section className="space-y-4">
            {items.map((item) => (
              <a
                key={`${item.link}-${item.publishedAt}`}
                className="block rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
                href={item.link}
                rel="noreferrer"
                target="_blank"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    {item.source}
                  </span>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
                    {item.category || "Uncategorized"}
                  </span>
                  <span>{formatPublishedDate(item.publishedAt)}</span>
                </div>
                <h2 className="mt-4 text-xl font-semibold leading-8 text-slate-950 sm:text-2xl">
                  {item.title}
                </h2>
              </a>
            ))}

            {items.length === 0 ? (
              <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-8 text-sm text-slate-600 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                No feed items are available right now.
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
