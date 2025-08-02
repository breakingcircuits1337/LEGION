import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 300

export async function POST() {
  const DEFENSE_API_BASE = process.env.DEFENSE_API_BASE
  if (!DEFENSE_API_BASE) {
    return new NextResponse("DEFENSE_API_BASE not set", { status: 500 })
  }
  const target = DEFENSE_API_BASE.replace(/\/$/, "") + "/stop_agent"
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 10000)
  let res: Response
  const token = process.env.DEFENSE_API_TOKEN
  const headers: Record<string, string> = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  try {
    res = await fetch(target, { method: "POST", signal: abortController.signal, headers })
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === "AbortError") {
      return new NextResponse("Upstream timeout", { status: 504 })
    }
    return new NextResponse("Upstream error", { status: 502 })
  }
  clearTimeout(timeout)
  // Forward status and message
  const body = await res.text()
  return new NextResponse(body, { status: res.status })
}