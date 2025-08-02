import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const DEFENSE_API_BASE = process.env.DEFENSE_API_BASE
  if (!DEFENSE_API_BASE) {
    return new NextResponse("DEFENSE_API_BASE not set", { status: 500 })
  }
  const body = await req.json()
  const target = DEFENSE_API_BASE.replace(/\/$/, "") + "/run_with_stream"

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 10000)
  let res: Response
  const token = process.env.DEFENSE_API_TOKEN
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  try {
    res = await fetch(target, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
      signal: abortController.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === "AbortError") {
      return new NextResponse("Upstream timeout", { status: 504 })
    }
    return new NextResponse("Upstream error", { status: 502 })
  }
  clearTimeout(timeout)
  // If error, forward status/message body
  if (res.status >= 400) {
    const errBody = await res.text()
    return new NextResponse(errBody, { status: res.status })
  }
  if (!res.body) {
    return new NextResponse("No stream from defense service", { status: 502 })
  }
  // Forward all headers
  const headers = new Headers(res.headers)
  headers.set("Cache-Control", "no-cache")
  headers.set("Connection", "keep-alive")
  headers.set("Content-Type", "text/event-stream")
  return new NextResponse(res.body, {
    status: 200,
    headers,
  })
}