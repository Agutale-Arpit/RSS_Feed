import { isRssError, parseRssFeed } from "@/lib/rss";
import type { FeedItem } from "@/lib/rss";

const OPENAI_RSS_FEED_URL = "https://openai.com/news/rss.xml";

export const runtime = "nodejs";
export const maxDuration = 15;

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

export async function GET(): Promise<Response> {
  try {
    const feed = await parseRssFeed(OPENAI_RSS_FEED_URL);
    const normalizedItems = normalizeFeedItems(feed.items);

    console.log("Parsed OpenAI RSS feed items:", normalizedItems);

    return Response.json(normalizedItems);
  } catch (error) {
    console.error("Failed to fetch or parse OpenAI RSS feed", error);

    return createErrorResponse(error);
  }
}