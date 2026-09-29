import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSessionFromRequest, hashPassword } from "@/lib/auth";
import { createDefaultCatalogFor } from "@/lib/catalogs";
import { updateUserSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin(req: Request) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) };
  if (user.role !== "ADMIN") return { error: NextResponse.json({ error: "Apenas administradores" }, { status: 403 }) };
  return { user };
}

// PATCH /api/users/[id] — atualiza nome, papel, ativo ou senha do colaborador
export async function PATCH(req: Request, context: RouteContext) {
  const { error, user: admin } = await requireAdmin(req);
  if (error) return error;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  // proteções: admin não pode rebaixar/desativar a si mesmo
  if (id === admin.id && ((parsed.data.role !== undefined && parsed.data.role !== "ADMIN") || parsed.data.active === false)) {
    return NextResponse.json({ error: "Você não pode rebaixar ou desativar a si mesmo" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      role: parsed.data.role,
      active: parsed.data.active,
      passwordHash: parsed.data.password ? await hashPassword(parsed.data.password) : undefined,
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  // ao virar MEMBER, garante um catálogo próprio (independente do principal)
  if (updated.role === "MEMBER") {
    const owned = await prisma.catalog.count({ where: { ownerId: updated.id } });
    if (owned === 0) {
      await createDefaultCatalogFor({ id: updated.id, name: updated.name });
    }
  }

  return NextResponse.json(updated);
}

// DELETE /api/users/[id] — remove o colaborador
export async function DELETE(req: Request, context: RouteContext) {
  const { error, user: admin } = await requireAdmin(req);
  if (error) return error;

  const { id } = await context.params;
  if (id === admin.id) {
    return NextResponse.json({ error: "Você não pode excluir a si mesmo" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }
}
