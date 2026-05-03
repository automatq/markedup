import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const links = await db.shareLink.findMany({
      where: { published: true, enabled: true, slug: { not: null } },
      select: {
        slug: true,
        document: { select: { updatedAt: true } },
      },
      take: 5000,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://marked.up";

    return links
      .filter((l) => l.slug)
      .map((l) => ({
        url: `${baseUrl}/p/${l.slug}`,
        lastModified: l.document?.updatedAt ?? new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch (err) {
    console.error("Sitemap generation failed:", err);
    return [];
  }
}
