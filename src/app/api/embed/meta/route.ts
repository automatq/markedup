import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/embed/meta?url=...
 * Fetches OpenGraph metadata from a URL for bookmark previews.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    // Fetch the page HTML
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarkedUp/1.0; +https://markedup.app)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ title: url, description: "", image: "", favicon: "" });
    }

    const html = await res.text();

    // Parse OpenGraph and meta tags with regex (lightweight, no DOM parser needed)
    const getOG = (property: string): string => {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"));
      return m?.[1] || "";
    };

    const title =
      getOG("og:title") ||
      getOG("twitter:title") ||
      (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim() ||
      url;

    const description =
      getOG("og:description") ||
      getOG("twitter:description") ||
      getOG("description") ||
      "";

    const image =
      getOG("og:image") ||
      getOG("twitter:image") ||
      "";

    // Resolve relative image URLs
    const resolvedImage = image && !image.startsWith("http")
      ? new URL(image, url).href
      : image;

    // Extract favicon
    const faviconMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i);
    const faviconRaw = faviconMatch?.[1] || "";
    const favicon = faviconRaw && !faviconRaw.startsWith("http")
      ? new URL(faviconRaw, url).href
      : faviconRaw || `${new URL(url).origin}/favicon.ico`;

    return NextResponse.json({
      title: title.slice(0, 200),
      description: description.slice(0, 500),
      image: resolvedImage,
      favicon,
    }, {
      headers: { "Cache-Control": "public, max-age=86400" }, // Cache 24h
    });
  } catch (err) {
    console.error("GET /api/embed/meta error:", err);
    return NextResponse.json({ title: "", description: "", image: "", favicon: "" });
  }
}
