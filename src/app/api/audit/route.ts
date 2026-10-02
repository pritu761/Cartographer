import { NextResponse } from "next/server";
import { runShipCriteriaAudit } from "@/../scripts/audit-ship-criteria";

export async function GET() {
  try {
    const audit = await runShipCriteriaAudit();
    return NextResponse.json({
      success: true,
      data: audit,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to run audit";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
