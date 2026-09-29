import { NextResponse } from "next/server";
import { searchMovies, tmdbImageUrl } from "@/lib/tmdb";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSessionFromRequest } from "@/lib/auth";
import { resolveCurrentCatalogFromRequest } from "@/lib/catalogs";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { searchQuerySchema } from "@/lib/validation";

// GET /api/search?q=...&page=1 — busca no TMDB e marca o que já está catalogado
export async function GET(req: Request) {
  const limited = rateLimit(`search:${clientIp(req)}`);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitas requisições, aguarde." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const url = new URL(req.url);
  const parsed = searchQuerySchema.safeParse({ q: url.searchParams.get("q") ?? "", page: url.searchParams.get("page") ?? "1" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  if (!process.env.TMDB_API_KEY) {
    return NextResponse.json({ error: "TMDB_API_KEY não configurada" }, { status: 500 });
  }

  try {
    const tmdb = await searchMovies(parsed.data.q, parsed.data.page);

    // marca filmes já presentes no catálogo ativo (falha aqui não bloqueia a busca)
    const ids = tmdb.results.map((r) => r.id);
    let inCatalog = new Set<number>();
    try {
      const user = await getActiveUser(await getSessionFromRequest(req));
      const catalogId = user ? (await resolveCurrentCatalogFromRequest(req, user)).id : null;
      const rows = await prisma.movie.findMany({
        where: catalogId ? { catalogId, tmdbId: { in: ids } } : { id: "__nenhum__" },
        select: { tmdbId: true },
      });
      inCatalog = new Set(rows.map((r) => r.tmdbId).filter((v): v is number => v !== null));
    } catch {
      // banco indisponível: busca segue funcionando
    }

    return NextResponse.json({
      page: tmdb.page,
      totalPages: Math.min(tmdb.total_pages, 50),
      totalResults: tmdb.total_results,
      results: tmdb.results.map((m) => ({
        tmdbId: m.id,
        title: m.title,
        overview: m.overview,
        posterUrl: tmdbImageUrl(m.poster_path, "w185"),
        backdropUrl: tmdbImageUrl(m.backdrop_path, "w780"),
        releaseDate: m.release_date,
        voteAverage: m.vote_average,
        inCatalog: inCatalog.has(m.id),
      })),
    });
  } catch (err) {
    console.error("Erro na busca:", err);
    return NextResponse.json({ error: "Falha ao consultar o TMDB" }, { status: 502 });
  }
}
