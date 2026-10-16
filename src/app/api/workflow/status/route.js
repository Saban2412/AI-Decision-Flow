import { NextResponse } from "next/server";

function buildMockExecutionPath(eventData, decision) {
  const { nodes = [], edges = [], startNodeId } = eventData;
  const executionPath = [];
  const visitedNodeIds = new Set();
  let currentNodeId = startNodeId || nodes[0]?.id;

  while (currentNodeId && !visitedNodeIds.has(currentNodeId)) {
    visitedNodeIds.add(currentNodeId);
    const currentNode = nodes.find((node) => node.id === currentNodeId);

    if (!currentNode) break;

    executionPath.push({
      nodeId: currentNode.id,
      prompt: currentNode.data?.prompt || "",
      decision,
    });

    const outgoingEdge = edges.find(
      (edge) =>
        edge.source === currentNode.id && edge.sourceHandle === decision,
    );
    currentNodeId = outgoingEdge?.target;
  }

  return executionPath;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  try {
    const cacheBuster = Date.now();
    const inngestRes = await fetch(
      `http://127.0.0.1:8288/v1/events/${encodeURIComponent(eventId)}/runs?_=${cacheBuster}`,
      { cache: "no-store" },
    );

    if (!inngestRes.ok) {
      const details = await inngestRes.text();
      console.error(
        `Inngest status request failed (${inngestRes.status}): ${details}`,
      );
      return NextResponse.json(
        {
          error: `Inngest returned HTTP ${inngestRes.status} while checking the workflow.`,
        },
        { status: 502 },
      );
    }

    const data = await inngestRes.json();
    const latestRun = data.data?.[0];

    if (!latestRun) {
      return NextResponse.json({ status: "Running", logs: [] });
    }

    const status = latestRun.status || "Running";
    let logs = latestRun.output?.executionPath || [];

    if (
      status.toLowerCase() === "completed" &&
      logs.length === 0 &&
      ["YES", "NO"].includes(process.env.LLM_MOCK_RESPONSE?.trim().toUpperCase())
    ) {
      const eventRes = await fetch(
        `http://127.0.0.1:8288/v1/events/${encodeURIComponent(eventId)}?_=${Date.now()}`,
        { cache: "no-store" },
      );

      if (eventRes.ok) {
        const eventResponse = await eventRes.json();
        logs = buildMockExecutionPath(
          eventResponse.data?.data || {},
          process.env.LLM_MOCK_RESPONSE.trim().toUpperCase(),
        );
      }
    }

    return NextResponse.json({
      status,
      logs,
      error: latestRun.output?.error || latestRun.error || undefined,
    });
  } catch (error) {
    console.error("Failed to query Inngest workflow status:", error);
    return NextResponse.json(
      {
        error:
          "Inngest dev server is unavailable. Start it on http://127.0.0.1:8288 and try again.",
      },
      { status: 503 },
    );
  }
}
