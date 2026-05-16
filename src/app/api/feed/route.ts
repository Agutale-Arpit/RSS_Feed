import { isRssError, parseRssFeed } from "@/lib/rss";
import type { FeedItem } from "@/lib/rss";

const OPENAI_RSS_FEED_URL = "https://openai.com/news/rss.xml";
const DEFAULT_FEED_LIMIT = 100;

export const runtime = "nodejs";
export const maxDuration = 15;

class FeedQueryError extends Error {
  readonly code = "INVALID_QUERY_PARAMETER";
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "FeedQueryError";
  }
}

type FeedQueryOptions = {
  limit: number;
};

function isFeedQueryError(error: unknown): error is FeedQueryError {
  return error instanceof FeedQueryError;
}

function parseFeedQuery(request: Request): FeedQueryOptions {
  const limitParam = new URL(request.url).searchParams.get("limit");

  if (limitParam === null) {
    return { limit: DEFAULT_FEED_LIMIT };
  }

  const normalizedLimit = limitParam.trim();

  if (!/^\d+$/.test(normalizedLimit)) {
    throw new FeedQueryError("The `limit` query parameter must be a positive integer.");
  }

  const limit = Number.parseInt(normalizedLimit, 10);

  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new FeedQueryError("The `limit` query parameter must be a positive integer.");
  }

  return { limit };
}

function normalizeFeedItems(feedItems: Awaited<ReturnType<typeof parseRssFeed>>["items"]): FeedItem[] {
  return feedItems
    .map((item) => ({
      title: item.title ?? "",
      link: item.link ?? "",
      publishedAt: item.pubDate ?? "",
      category: item.categories?.[0] ?? "",
      source: "OpenAI",
    }))
    .sort((leftItem, rightItem) => {
      const leftTimestamp = Date.parse(leftItem.publishedAt) || 0;
      const rightTimestamp = Date.parse(rightItem.publishedAt) || 0;

      return rightTimestamp - leftTimestamp;
    });
}

function createErrorResponse(error: unknown): Response {
  if (isFeedQueryError(error)) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    );
  }

  if (isRssError(error)) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    );
  }

  return Response.json(
    {
      error: "Failed to fetch or parse the OpenAI RSS feed.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 },
  );
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { limit } = parseFeedQuery(request);
    const feed = await parseRssFeed(OPENAI_RSS_FEED_URL);
    const normalizedItems = normalizeFeedItems(feed.items);
    const limitedItems = normalizedItems.slice(0, limit);

    console.log("Parsed OpenAI RSS feed items:", limitedItems);

    return Response.json(limitedItems);
  } catch (error) {
    console.error("Failed to fetch or parse OpenAI RSS feed", error);

    return createErrorResponse(error);
  }
}