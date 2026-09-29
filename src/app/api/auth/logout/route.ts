import { NextResponse } from "next/server";
import { clearSessionCookieHeader } from "@/lib/auth";

// POST /api/auth/logout — encerra a sessão
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", clearSessionCookieHeader());
  return res;
}
