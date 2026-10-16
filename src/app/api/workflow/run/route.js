import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(req) {
  try {
    const { nodes, edges, initialInput } = await req.json();

    if (!nodes || nodes.length === 0) {
      return NextResponse.json(
        { error: "Workflow must contain at least one node." },
        { status: 400 },
      );
    }

    if (!initialInput) {
      return NextResponse.json(
        { error: "Initial input message is required." },
        { status: 400 },
      );
    }

    const { ids } = await inngest.send({
      name: "workflow/execute.requested",
      data: {
        nodes,
        edges,
        initialInput,
        startNodeId: nodes[0].id,
      },
    });

    return NextResponse.json({
      message: "Workflow execution started",
      eventId: ids[0],
    });
  } catch (error) {
    console.error("Failed to trigger workflow:", error);
    return NextResponse.json(
      { error: "Failed to trigger workflow execution" },
      { status: 500 },
    );
  }
}
