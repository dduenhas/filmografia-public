import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSessionFromRequest } from "@/lib/auth";
import { catalogCookieHeader, canWriteCatalog, ensureOwnCatalog, getSharedCatalog } from "@/lib/catalogs";
import { renameCatalogSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/catalogs/[id] — renomeia um catálogo (dono, ou ADMIN no catálogo compartilhado).
export async function PATCH(req: Request, context: RouteContext) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await context.params;
  const catalog = await prisma.catalog.findUnique({
    where: { id },
    select: { id: true, isShared: true, ownerId: true, owner: { select: { role: true } } },
  });
  if (!catalog) return NextResponse.json({ error: "Catálogo não encontrado" }, { status: 404 });

  // compartilhado: só ADMIN renomeia; pessoais: o time (ADMIN/COLLABORATOR) co-gerencia.
  const canRename = catalog.isShared ? user.role === "ADMIN" : canWriteCatalog(user, catalog);
  if (!canRename) return NextResponse.json({ error: "Sem permissão neste catálogo" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = renameCatalogSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nome inválido" }, { status: 400 });

  const updated = await prisma.catalog.update({
    where: { id },
    data: { name: parsed.data.name },
    select: { id: true, name: true, isShared: true, ownerId: true },
  });
  return NextResponse.json(updated);
}

// DELETE /api/catalogs/[id] — exclui um catálogo pessoal (e seus filmes). O compartilhado não pode ser excluído.
export async function DELETE(req: Request, context: RouteContext) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await context.params;
  const catalog = await prisma.catalog.findUnique({
    where: { id },
    select: { id: true, isShared: true, ownerId: true, owner: { select: { role: true } } },
  });
  if (!catalog) return NextResponse.json({ error: "Catálogo não encontrado" }, { status: 404 });
  if (catalog.isShared) return NextResponse.json({ error: "O catálogo principal não pode ser excluído" }, { status: 400 });
  if (!canWriteCatalog(user, catalog)) return NextResponse.json({ error: "Sem permissão neste catálogo" }, { status: 403 });

  await prisma.catalog.delete({ where: { id } });

  // se o catálogo excluído era o ativo, volta para um catálogo válido
  const fallback = user.role === "MEMBER" ? await ensureOwnCatalog(user) : await getSharedCatalog();
  const res = NextResponse.json({ ok: true, activeId: fallback.id });
  res.headers.append("Set-Cookie", catalogCookieHeader(fallback.id));
  return res;
}
