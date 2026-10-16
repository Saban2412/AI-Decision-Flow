import { NextResponse } from "next/server";

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
    return NextResponse.json({
      status,
      logs: latestRun.output?.executionPath || [],
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
