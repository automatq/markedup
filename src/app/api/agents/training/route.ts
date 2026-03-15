import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/agents/training?agentId=...
 * List training docs for an agent.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agentId = request.nextUrl.searchParams.get("agentId");
    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const agent = await db.agentConfig.findUnique({
      where: { id: agentId },
      select: { workspaceId: true },
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(agent.workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const trainingDocs = await db.agentTrainingDoc.findMany({
      where: { agentId },
      include: {
        document: {
          select: { id: true, title: true, updatedAt: true },
        },
      },
      orderBy: { addedAt: "desc" },
    });

    return NextResponse.json(
      trainingDocs.map((td) => ({
        id: td.id,
        documentId: td.document.id,
        title: td.document.title,
        updatedAt: td.document.updatedAt,
        addedAt: td.addedAt,
      }))
    );
  } catch (err) {
    console.error("GET /api/agents/training error:", err);
    return NextResponse.json({ error: "Failed to fetch training docs" }, { status: 500 });
  }
}

/**
 * POST /api/agents/training
 * Link a document as training material for an agent.
 * Body: { agentId, documentId }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId, documentId } = await request.json();
    if (!agentId || !documentId) {
      return NextResponse.json({ error: "agentId and documentId required" }, { status: 400 });
    }

    const agent = await db.agentConfig.findUnique({
      where: { id: agentId },
      select: { workspaceId: true },
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(agent.workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const link = await db.agentTrainingDoc.create({
      data: { agentId, documentId, addedBy: userId },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Document already linked" }, { status: 409 });
    }
    console.error("POST /api/agents/training error:", err);
    return NextResponse.json({ error: "Failed to link training doc" }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/training?id=...
 * Unlink a training doc from an agent.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const link = await db.agentTrainingDoc.findUnique({
      where: { id },
      include: { agent: { select: { workspaceId: true } } },
    });
    if (!link) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(link.agent.workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.agentTrainingDoc.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/agents/training error:", err);
    return NextResponse.json({ error: "Failed to unlink training doc" }, { status: 500 });
  }
}
