import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const DEFENSE_API_BASE = process.env.DEFENSE_API_BASE
  if (!DEFENSE_API_BASE) {
    return new NextResponse("DEFENSE_API_BASE not set", { status: 500 })
  }
  const body = await req.json()
  const target = DEFENSE_API_BASE.replace(/\/$/, "") + "/run_with_stream"

  const res = await fetch(target, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
  if (!res.body) {
    return new NextResponse("No stream from defense service", { status: 502 })
  }
  // Stream the response as text/event-stream
  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}