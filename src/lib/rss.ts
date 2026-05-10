import Parser from "rss-parser";

const RSS_FETCH_TIMEOUT_MS = 10_000;
const RSS_REVALIDATE_SECONDS = 300;
const RSS_REQUEST_HEADERS = {
  "User-Agent": "rss-feed/0.1.0",
  Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
} as const;

type RssErrorCode =
  | "RSS_FETCH_FAILED"
  | "RSS_FETCH_TIMEOUT"
  | "RSS_PARSE_FAILED";

export type FeedItem = {
  title: string;
  link: string;
  publishedAt: string;
  category: string;
  source: string;
};

export type RssFeedItem = Parser.Item;
export type RssFeed = Parser.Output<RssFeedItem>;

export class RssError extends Error {
  readonly code: RssErrorCode;
  readonly status: number;
  readonly cause?: unknown;

  constructor(options: {
    code: RssErrorCode;
    message: string;
    status: number;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = "RssError";
    this.code = options.code;
    this.status = options.status;
    this.cause = options.cause;
  }
}

const rssParser = new Parser<Record<string, never>, RssFeedItem>();

export function isRssError(error: unknown): error is RssError {
  return error instanceof RssError;
}

async function fetchRssXml(feedUrl: string): Promise<string> {
  let response: Response;

  try {
    response = await fetch(feedUrl, {
      headers: RSS_REQUEST_HEADERS,
      next: { revalidate: RSS_REVALIDATE_SECONDS },
      redirect: "follow",
      signal: AbortSignal.timeout(RSS_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new RssError({
        code: "RSS_FETCH_TIMEOUT",
        message: `Timed out fetching RSS feed after ${RSS_FETCH_TIMEOUT_MS}ms.`,
        status: 504,
        cause: error,
      });
    }

    throw new RssError({
      code: "RSS_FETCH_FAILED",
      message: "Failed to fetch the upstream RSS feed.",
      status: 502,
      cause: error,
    });
  }

  if (!response.ok) {
    throw new RssError({
      code: "RSS_FETCH_FAILED",
      message: `Upstream RSS feed request failed with status ${response.status}.`,
      status: 502,
    });
  }

  const xml = await response.text();

  if (!xml.trim()) {
    throw new RssError({
      code: "RSS_FETCH_FAILED",
      message: "Upstream RSS feed returned an empty response.",
      status: 502,
    });
  }

  return xml;
}

export async function parseRssFeed(feedUrl: string): Promise<RssFeed> {
  const xml = await fetchRssXml(feedUrl);

  return parseRssXml(xml);
}

export async function parseRssXml(xml: string): Promise<RssFeed> {
  try {
    return await rssParser.parseString(xml);
  } catch (error) {
    throw new RssError({
      code: "RSS_PARSE_FAILED",
      message: "Failed to parse the upstream RSS XML.",
      status: 502,
      cause: error,
    });
  }
}
