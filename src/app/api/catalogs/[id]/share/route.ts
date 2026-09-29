import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSessionFromRequest } from "@/lib/auth";
import {
  canWriteCatalog,
  ensureShareToken,
  getShareToken,
  revokeShareToken,
  type ActiveUser,
  type CatalogAccess,
} from "@/lib/catalogs";

type RouteContext = { params: Promise<{ id: string }> };

async function loadCatalog(id: string) {
  return prisma.catalog.findUnique({
    where: { id },
    select: { id: true, isShared: true, ownerId: true, owner: { select: { role: true } } },
  });
}

// Regra de gestão do link: compartilhado → só ADMIN; pessoais → dono/equipe (mesma regra de escrita).
function canManageShare(user: ActiveUser, catalog: CatalogAccess) {
  return catalog.isShared ? user.role === "ADMIN" : canWriteCatalog(user, catalog);
}

// GET /api/catalogs/[id]/share — retorna o token atual (null se desativado), sem criar.
export async function GET(req: Request, context: RouteContext) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await context.params;
  const catalog = await loadCatalog(id);
  if (!catalog) return NextResponse.json({ error: "Catálogo não encontrado" }, { status: 404 });
  if (!canManageShare(user, catalog)) return NextResponse.json({ error: "Sem permissão neste catálogo" }, { status: 403 });

  const token = await getShareToken(id);
  return NextResponse.json({ token });
}

// POST /api/catalogs/[id]/share — cria (ou retorna) o token do link público somente-leitura.
export async function POST(req: Request, context: RouteContext) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await context.params;
  const catalog = await loadCatalog(id);
  if (!catalog) return NextResponse.json({ error: "Catálogo não encontrado" }, { status: 404 });
  if (!canManageShare(user, catalog)) return NextResponse.json({ error: "Sem permissão neste catálogo" }, { status: 403 });

  const token = await ensureShareToken(id);
  return NextResponse.json({ token, url: `/c/${token}` });
}

// DELETE /api/catalogs/[id]/share — desativa o link público do catálogo.
export async function DELETE(req: Request, context: RouteContext) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await context.params;
  const catalog = await loadCatalog(id);
  if (!catalog) return NextResponse.json({ error: "Catálogo não encontrado" }, { status: 404 });
  if (!canManageShare(user, catalog)) return NextResponse.json({ error: "Sem permissão neste catálogo" }, { status: 403 });

  await revokeShareToken(id);
  return NextResponse.json({ token: null });
}
