import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSessionFromRequest } from "@/lib/auth";
import { canWriteCatalog } from "@/lib/catalogs";
import { updateMovieSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

/** Carrega o filme com seu catálogo e garante que o usuário pode escrever nele. */
async function loadWritableMovie(req: Request, id: string) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) };

  const movie = await prisma.movie.findUnique({
    where: { id },
    select: { id: true, catalog: { select: { isShared: true, ownerId: true, owner: { select: { role: true } } } } },
  });
  if (!movie) return { error: NextResponse.json({ error: "Filme não encontrado" }, { status: 404 }) };
  if (!canWriteCatalog(user, movie.catalog)) {
    return { error: NextResponse.json({ error: "Sem permissão neste catálogo" }, { status: 403 }) };
  }
  return { user, movie };
}

// PATCH /api/movies/[id] — atualiza dados pessoais do filme no catálogo
export async function PATCH(req: Request, context: RouteContext) {
  const limited = rateLimit(`update:${clientIp(req)}`, 30);
  if (!limited.ok) {
    return NextResponse.json({ error: "Muitas requisições, aguarde." }, { status: 429 });
  }

  const { id } = await context.params;
  const guard = await loadWritableMovie(req, id);
  if (guard.error) return guard.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateMovieSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = { ...parsed.data };

  // ao marcar como assistido pela primeira vez, registra a data automaticamente
  if (data.watched === true && data.watchedAt === undefined) {
    const existing = await prisma.movie.findUnique({ where: { id }, select: { watched: true, watchedAt: true } });
    if (existing && !existing.watched && !existing.watchedAt) {
      data.watchedAt = new Date().toISOString();
    }
  }
  if (data.watched === false) {
    data.watchedAt = null;
  }

  try {
    const movie = await prisma.movie.update({
      where: { id },
      data: {
        favorite: data.favorite,
        watchlist: data.watchlist,
        watched: data.watched,
        personalRating: data.personalRating === undefined ? undefined : data.personalRating,
        notes: data.notes === undefined ? undefined : data.notes,
        watchedAt: data.watchedAt === undefined ? undefined : data.watchedAt ? new Date(data.watchedAt) : null,
        location: data.location === undefined ? undefined : data.location,
        shelf: data.shelf === undefined ? undefined : data.shelf,
        rack: data.rack === undefined ? undefined : data.rack,
        numbering: data.numbering === undefined ? undefined : data.numbering,
        mediaType: data.mediaType === undefined ? undefined : data.mediaType,
        mediaUrl: data.mediaUrl === undefined ? undefined : data.mediaUrl,
      },
      select: {
        id: true,
        favorite: true,
        watchlist: true,
        watched: true,
        personalRating: true,
        notes: true,
        watchedAt: true,
        location: true,
        shelf: true,
        rack: true,
        numbering: true,
        mediaType: true,
        mediaUrl: true,
      },
    });
    return NextResponse.json(movie);
  } catch (err) {
    console.error("Erro ao atualizar filme:", err);
    return NextResponse.json({ error: "Filme não encontrado" }, { status: 404 });
  }
}

// DELETE /api/movies/[id] — remove o filme do catálogo
export async function DELETE(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const guard = await loadWritableMovie(req, id);
  if (guard.error) return guard.error;

  try {
    await prisma.movie.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao remover filme:", err);
    return NextResponse.json({ error: "Filme não encontrado" }, { status: 404 });
  }
}
