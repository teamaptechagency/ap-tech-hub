import { NextResponse } from "next/server";

export async function POST() {
  return new NextResponse(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store, max-age=0",
      "clear-site-data": '"cache", "storage", "executionContexts"',
    },
  });
}
