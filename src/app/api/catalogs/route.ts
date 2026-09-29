import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSessionFromRequest } from "@/lib/auth";
import {
  catalogCookieHeader,
  listAccessibleCatalogs,
  resolveCurrentCatalogFromRequest,
} from "@/lib/catalogs";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createCatalogSchema } from "@/lib/validation";

// GET /api/catalogs — lista os catálogos acessíveis ao usuário, com contagem de filmes.
export async function GET(req: Request) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const [accessible, active] = await Promise.all([
    listAccessibleCatalogs(user),
    resolveCurrentCatalogFromRequest(req, user),
  ]);

  const counts = await prisma.movie.groupBy({
    by: ["catalogId"],
    where: { catalogId: { in: accessible.map((c) => c.id) } },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.catalogId, c._count._all]));

  return NextResponse.json({
    activeId: active.id,
    catalogs: accessible.map((c) => ({ ...c, movieCount: countMap.get(c.id) ?? 0 })),
  });
}

// POST /api/catalogs — cria um catálogo pessoal novo e já o seleciona como ativo.
export async function POST(req: Request) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const limited = rateLimit(`catalogs:${clientIp(req)}`, 15);
  if (!limited.ok) {
    return NextResponse.json({ error: "Aguarde um instante." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createCatalogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
  }

  try {
    const catalog = await prisma.catalog.create({
      data: { name: parsed.data.name, ownerId: user.id },
      select: { id: true, name: true, isShared: true, ownerId: true },
    });
    const res = NextResponse.json({ ...catalog, movieCount: 0 }, { status: 201 });
    res.headers.append("Set-Cookie", catalogCookieHeader(catalog.id));
    return res;
  } catch (err) {
    console.error("Erro ao criar catálogo:", err);
    return NextResponse.json({ error: "Falha ao criar catálogo" }, { status: 500 });
  }
}
