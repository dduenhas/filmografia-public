import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSessionFromRequest } from "@/lib/auth";
import { canViewCatalog, catalogCookieHeader, CATALOG_ACCESS_SELECT } from "@/lib/catalogs";

// POST /api/catalogs/select — define o catálogo ativo (cookie) após validar o acesso.
export async function POST(req: Request) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = z.string().min(1).max(40).safeParse((body as { id?: unknown })?.id);
  if (!parsed.success) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const catalog = await prisma.catalog.findUnique({
    where: { id: parsed.data },
    select: CATALOG_ACCESS_SELECT,
  });
  if (!catalog || !canViewCatalog(user, catalog)) {
    return NextResponse.json({ error: "Catálogo não encontrado" }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true, id: catalog.id });
  res.headers.append("Set-Cookie", catalogCookieHeader(catalog.id));
  return res;
}
