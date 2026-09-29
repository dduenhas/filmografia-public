import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword, needsBootstrap, sessionCookieHeader } from "@/lib/auth";
import { bootstrapSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// POST /api/auth/bootstrap — cria o primeiro usuário (ADMIN).
// Só funciona enquanto não existir NENHUM usuário no banco (first-run).
export async function POST(req: Request) {
  const limited = rateLimit(`bootstrap:${clientIp(req)}`, 5);
  if (!limited.ok) {
    return NextResponse.json({ error: "Aguarde um instante." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bootstrapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!(await needsBootstrap())) {
    return NextResponse.json({ error: "O sistema já possui usuários. Faça login." }, { status: 409 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.password),
        role: "ADMIN",
      },
    });

    const token = await createSessionToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const res = NextResponse.json({ ok: true, name: user.name, role: user.role });
    res.headers.append("Set-Cookie", sessionCookieHeader(token));
    return res;
  } catch (err) {
    // corrida entre dois bootstraps simultâneos: o unique constraint do e-mail protege
    console.error("Erro no bootstrap:", err);
    return NextResponse.json({ error: "Não foi possível criar o administrador" }, { status: 409 });
  }
}
