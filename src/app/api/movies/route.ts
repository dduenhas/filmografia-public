import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFullMovieDetails } from "@/lib/tmdb";
import { getActiveUser, getSessionFromRequest } from "@/lib/auth";
import { canWriteCatalog, resolveCurrentCatalogFromRequest } from "@/lib/catalogs";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { importMovieSchema } from "@/lib/validation";

// POST /api/movies — importa (ou atualiza metadados de) um filme do TMDB para o catálogo ativo.
// Exige sessão válida. Campos pessoais (favorito, nota, anotações...) são preservados.
export async function POST(req: Request) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const catalog = await resolveCurrentCatalogFromRequest(req, user);
  if (!canWriteCatalog(user, catalog)) {
    return NextResponse.json({ error: "Sem permissão neste catálogo" }, { status: 403 });
  }

  const limited = rateLimit(`import:${clientIp(req)}`, 10);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitas importações em sequência, aguarde." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = importMovieSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "tmdbId inválido" }, { status: 400 });
  }

  try {
    const m = await getFullMovieDetails(parsed.data.tmdbId);

    // unicidade por catálogo (o mesmo filme pode existir em catálogos diferentes)
    const movie = await prisma.movie.upsert({
      where: { catalogId_tmdbId: { catalogId: catalog.id, tmdbId: m.tmdbId } },
      create: {
        catalogId: catalog.id,
        source: "TMDB",
        tmdbId: m.tmdbId,
        imdbId: m.imdbId,
        title: m.title,
        originalTitle: m.originalTitle,
        overview: m.overview,
        tagline: m.tagline,
        posterPath: m.posterPath,
        backdropPath: m.backdropPath,
        homepage: m.homepage,
        releaseDate: m.releaseDate ? new Date(`${m.releaseDate}T00:00:00Z`) : null,
        runtime: m.runtime,
        genres: m.genres,
        countries: m.countries,
        cast: m.castNames,
        productionCompanies: m.productionCompanies,
        voteAverage: m.voteAverage,
        trailerKey: m.trailerKey,
        director: m.director,
        addedBy: user.name,
      },
      update: {
        imdbId: m.imdbId ?? undefined,
        title: m.title,
        originalTitle: m.originalTitle ?? undefined,
        overview: m.overview ?? undefined,
        tagline: m.tagline ?? undefined,
        posterPath: m.posterPath ?? undefined,
        backdropPath: m.backdropPath ?? undefined,
        homepage: m.homepage ?? undefined,
        releaseDate: m.releaseDate ? new Date(`${m.releaseDate}T00:00:00Z`) : undefined,
        runtime: m.runtime ?? undefined,
        genres: m.genres,
        countries: m.countries,
        cast: m.castNames,
        productionCompanies: m.productionCompanies,
        voteAverage: m.voteAverage,
        trailerKey: m.trailerKey ?? undefined,
        director: m.director ?? undefined,
      },
    });

    return NextResponse.json({ id: movie.id, tmdbId: movie.tmdbId, title: movie.title }, { status: 201 });
  } catch (err) {
    console.error("Erro ao importar filme:", err);
    const dbDown = err instanceof Error && err.message.includes("DATABASE_URL");
    return NextResponse.json(
      { error: dbDown ? "Banco de dados não configurado" : "Falha ao importar filme" },
      { status: dbDown ? 503 : 502 },
    );
  }
}
