import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSessionFromRequest } from "@/lib/auth";
import { canWriteCatalog, resolveCurrentCatalogFromRequest } from "@/lib/catalogs";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { manualMovieSchema } from "@/lib/validation";

// POST /api/movies/manual — cadastra manualmente um filme não encontrado nos catálogos oficiais.
// A imagem (posterUrl/backdropUrl) e os links (trailer/homepage/IMDb) são URLs livres informadas pelo usuário.
export async function POST(req: Request) {
  const user = await getActiveUser(await getSessionFromRequest(req));
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const catalog = await resolveCurrentCatalogFromRequest(req, user);
  if (!canWriteCatalog(user, catalog)) {
    return NextResponse.json({ error: "Sem permissão neste catálogo" }, { status: 403 });
  }

  const limited = rateLimit(`manual:${clientIp(req)}`, 15);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitos cadastros em sequência, aguarde." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = manualMovieSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  try {
    const movie = await prisma.movie.create({
      data: {
        catalogId: catalog.id,
        source: "MANUAL",
        tmdbId: null,
        title: d.title,
        originalTitle: d.originalTitle,
        overview: d.overview,
        tagline: d.tagline,
        // cadastro manual guarda a URL absoluta da imagem diretamente no campo *Path
        posterPath: d.posterUrl,
        backdropPath: d.backdropUrl,
        trailerUrl: d.trailerUrl,
        homepage: d.homepage,
        imdbId: d.imdbId,
        releaseDate: d.releaseDate ? new Date(`${d.releaseDate}T00:00:00Z`) : null,
        runtime: d.runtime ?? null,
        genres: d.genres,
        countries: d.countries,
        cast: d.cast,
        productionCompanies: d.productionCompanies,
        director: d.director,
        voteAverage: d.voteAverage ?? null,
        location: d.location,
        shelf: d.shelf,
        rack: d.rack,
        numbering: d.numbering,
        mediaType: d.mediaType,
        mediaUrl: d.mediaUrl,
        addedBy: user.name,
      },
      select: { id: true, title: true },
    });
    return NextResponse.json({ id: movie.id, title: movie.title }, { status: 201 });
  } catch (err) {
    console.error("Erro ao cadastrar filme manual:", err);
    const dbDown = err instanceof Error && err.message.includes("DATABASE_URL");
    return NextResponse.json(
      { error: dbDown ? "Banco de dados não configurado" : "Falha ao cadastrar filme" },
      { status: dbDown ? 503 : 500 },
    );
  }
}
