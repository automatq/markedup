import { db } from "@/lib/db";

/**
 * Extract plain text from TipTap JSON content.
 */
function extractText(json: any): string {
  if (!json) return "";
  if (typeof json === "string") return json;
  if (json.type === "text") return json.text || "";
  if (Array.isArray(json.content)) {
    return json.content.map(extractText).join(json.type === "paragraph" ? "\n" : "");
  }
  return "";
}

/**
 * Fetch all training docs for an agent and return formatted context string.
 * Returns empty string if no training docs exist.
 */
export async function getTrainingContext(agentConfigId: string): Promise<string> {
  const trainingLinks = await db.agentTrainingDoc.findMany({
    where: { agentId: agentConfigId },
    include: {
      document: {
        select: { title: true, content: true },
      },
    },
    orderBy: { addedAt: "asc" },
  });

  if (trainingLinks.length === 0) return "";

  const sections = trainingLinks.map((link) => {
    const text = extractText(link.document.content);
    return `### ${link.document.title || "Untitled"}\n${text}`;
  });

  return `\n\n---\n\n## Training Material\n\nThe following documents have been provided as training material to inform your expertise and decision-making. Use this knowledge as background context when responding.\n\n${sections.join("\n\n---\n\n")}`;
}
