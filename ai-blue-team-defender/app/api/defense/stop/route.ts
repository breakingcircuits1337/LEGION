import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 300

export async function POST() {
  const DEFENSE_API_BASE = process.env.DEFENSE_API_BASE
  if (!DEFENSE_API_BASE) {
    return new NextResponse("DEFENSE_API_BASE not set", { status: 500 })
  }
  const target = DEFENSE_API_BASE.replace(/\/$/, "") + "/stop_agent"
  const res = await fetch(target, { method: "POST" })
  return new NextResponse(null, { status: res.status })
}