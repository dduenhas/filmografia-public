import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSessionFromRequest, hashPassword } from "@/lib/auth";
import { createDefaultCatalogFor } from "@/lib/catalogs";
import { createUserSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

async function requireAdmin(req: Request) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) };
  if (user.role !== "ADMIN") return { error: NextResponse.json({ error: "Apenas administradores" }, { status: 403 }) };
  return { user };
}

// GET /api/users — lista os colaboradores
export async function GET(req: Request) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

// POST /api/users — cadastra um novo colaborador
export async function POST(req: Request) {
  const { error, user } = await requireAdmin(req);
  if (error) return error;

  const limited = rateLimit(`users:${clientIp(req)}`, 10);
  if (!limited.ok) {
    return NextResponse.json({ error: "Aguarde um instante." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Já existe um usuário com este e-mail" }, { status: 409 });
  }

  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  // MEMBER começa com um catálogo próprio, zerado e independente do principal
  if (created.role === "MEMBER") {
    await createDefaultCatalogFor({ id: created.id, name: created.name });
  }

  console.info(`Usuário ${created.email} criado por ${user.email}`);
  return NextResponse.json(created, { status: 201 });
}
