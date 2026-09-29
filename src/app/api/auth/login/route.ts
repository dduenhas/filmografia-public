import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, sessionCookieHeader, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// POST /api/auth/login — autentica e emite o cookie de sessão
export async function POST(req: Request) {
  const limited = rateLimit(`login:${clientIp(req)}`, 8);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um instante." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // mensagem genérica de propósito: não revela se o e-mail existe
  if (!user || !user.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 });
  }

  const token = await createSessionToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  const res = NextResponse.json({ ok: true, name: user.name, role: user.role });
  res.headers.append("Set-Cookie", sessionCookieHeader(token));
  return res;
}
