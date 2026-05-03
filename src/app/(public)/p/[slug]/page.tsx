import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toHtml } from "@/lib/render/to-html";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchPublishedDoc(slug: string) {
  const link = await db.shareLink.findUnique({
    where: { slug },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          content: true,
          updatedAt: true,
          searchContent: true,
        },
      },
    },
  });

  if (!link || !link.published || !link.enabled) return null;
  if (!link.document) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;

  return { link, document: link.document };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublishedDoc(slug);

  if (!data) {
    return {
      title: "Not found — MarkedUp",
    };
  }

  const title = data.link.seoTitle || data.document.title || "Untitled";
  const description = data.link.seoDescription
    || data.document.searchContent?.slice(0, 160)
    || `${data.document.title} — published on MarkedUp`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      modifiedTime: data.document.updatedAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublishedPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await fetchPublishedDoc(slug);

  if (!data) {
    notFound();
  }

  const html = toHtml(data.document.content as any);
  const title = data.link.seoTitle || data.document.title || "Untitled";
  const updated = new Date(data.document.updatedAt).toLocaleDateString();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <header className="border-b border-black/8 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <a
            href="/"
            className="text-sm font-semibold text-black dark:text-white tracking-tight"
          >
            MarkedUp
          </a>
          <span className="text-[11px] text-black/40 dark:text-white/40">
            Published page
          </span>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-black dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-xs text-black/40 dark:text-white/40">
            Last updated {updated}
          </p>
        </div>

        <div
          className="prose prose-sm max-w-none text-black/80 dark:text-white/75 prose-headings:text-black dark:prose-headings:text-white prose-strong:text-black dark:prose-strong:text-white prose-code:text-black/70 dark:prose-code:text-white/70 prose-code:bg-black/5 dark:prose-code:bg-white/5 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-blockquote:border-black/15 dark:prose-blockquote:border-white/15 prose-blockquote:text-black/60 dark:prose-blockquote:text-white/50 prose-hr:border-black/8 dark:prose-hr:border-white/10 prose-a:text-indigo-500 dark:prose-a:text-indigo-400"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>

      <footer className="border-t border-black/8 dark:border-white/10 mt-12">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
          >
            Made with <span className="font-semibold">MarkedUp</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
