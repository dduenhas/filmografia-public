import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSessionFromRequest } from "@/lib/auth";
import { canWriteCatalog } from "@/lib/catalogs";
import { updateManualMovieSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/movies/manual/[id] — edita os metadados de um filme cadastrado manualmente.
export async function PATCH(req: Request, context: RouteContext) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const limited = rateLimit(`manual:${clientIp(req)}`, 20);
  if (!limited.ok) {
    return NextResponse.json({ error: "Muitas requisições, aguarde." }, { status: 429 });
  }

  const { id } = await context.params;
  const movie = await prisma.movie.findUnique({
    where: { id },
    select: { id: true, source: true, catalog: { select: { isShared: true, ownerId: true, owner: { select: { role: true } } } } },
  });
  if (!movie) return NextResponse.json({ error: "Filme não encontrado" }, { status: 404 });
  if (!canWriteCatalog(user, movie.catalog)) {
    return NextResponse.json({ error: "Sem permissão neste catálogo" }, { status: 403 });
  }
  if (movie.source !== "MANUAL") {
    return NextResponse.json({ error: "Só é possível editar filmes cadastrados manualmente" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateManualMovieSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  try {
    const updated = await prisma.movie.update({
      where: { id },
      data: {
        title: d.title,
        originalTitle: d.originalTitle === undefined ? undefined : d.originalTitle,
        overview: d.overview === undefined ? undefined : d.overview,
        tagline: d.tagline === undefined ? undefined : d.tagline,
        posterPath: d.posterUrl === undefined ? undefined : d.posterUrl,
        backdropPath: d.backdropUrl === undefined ? undefined : d.backdropUrl,
        trailerUrl: d.trailerUrl === undefined ? undefined : d.trailerUrl,
        homepage: d.homepage === undefined ? undefined : d.homepage,
        imdbId: d.imdbId === undefined ? undefined : d.imdbId,
        releaseDate: d.releaseDate === undefined ? undefined : d.releaseDate ? new Date(`${d.releaseDate}T00:00:00Z`) : null,
        runtime: d.runtime === undefined ? undefined : d.runtime,
        genres: d.genres,
        countries: d.countries,
        cast: d.cast,
        productionCompanies: d.productionCompanies,
        director: d.director === undefined ? undefined : d.director,
        voteAverage: d.voteAverage === undefined ? undefined : d.voteAverage,
        location: d.location === undefined ? undefined : d.location,
        shelf: d.shelf === undefined ? undefined : d.shelf,
        rack: d.rack === undefined ? undefined : d.rack,
        numbering: d.numbering === undefined ? undefined : d.numbering,
        mediaType: d.mediaType === undefined ? undefined : d.mediaType,
        mediaUrl: d.mediaUrl === undefined ? undefined : d.mediaUrl,
      },
      select: { id: true, title: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Erro ao editar filme manual:", err);
    return NextResponse.json({ error: "Falha ao salvar alterações" }, { status: 500 });
  }
}
