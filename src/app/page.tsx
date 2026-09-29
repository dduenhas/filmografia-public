import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SearchX, TriangleAlert, Sparkles, PenLine } from "lucide-react";
import { getCatalog, getFacets, getTabCounts, type CatalogQuery, type CatalogSort, type CatalogTab, type Facets } from "@/lib/catalog";
import { catalogQuerySchema } from "@/lib/validation";
import { getTrending } from "@/lib/tmdb";
import { getActiveUser, getSession } from "@/lib/auth";
import { listAccessibleCatalogs, resolveCurrentCatalog, SHARED_CATALOG_ID } from "@/lib/catalogs";
import { prisma } from "@/lib/prisma";
import { MovieCard, type MovieCardData } from "@/components/movie-card";
import { CatalogTabs } from "@/components/catalog-tabs";
import { SortSelect } from "@/components/sort-select";
import { Pagination } from "@/components/pagination";
import { FiltersPanel } from "@/components/filters-panel";
import { ReportButton } from "@/components/report-button";
import { CatalogSwitcher, type CatalogOption } from "@/components/catalog-switcher";

// Sempre dinâmico: lê o PostgreSQL a cada request (catálogo pessoal atualizado em tempo real)
export const dynamic = "force-dynamic";

const GRID_CLASS = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

const EMPTY_FACETS: Facets = { genres: [], countries: [], cast: [], directors: [], companies: [], years: [], locations: [], shelves: [] };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getActiveUser(await getSession());
  if (!user) redirect("/login");

  const raw = await searchParams;
  // normaliza: pega apenas o primeiro valor de cada parâmetro
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") flat[k] = v;
    else if (Array.isArray(v) && typeof v[0] === "string") flat[k] = v[0];
  }

  const parsed = catalogQuerySchema.safeParse(flat);
  const p = parsed.success
    ? parsed.data
    : {
        tab: "all" as CatalogTab,
        q: "",
        genres: [] as string[],
        countries: [] as string[],
        yearFrom: undefined,
        yearTo: undefined,
        cast: "",
        director: "",
        company: "",
        mediaType: "",
        location: "",
        shelf: "",
        sort: "recent" as CatalogSort,
        page: 1,
      };

  let catalog: { id: string; name: string } = { id: SHARED_CATALOG_ID, name: "Catálogo principal" };
  let catalogs: CatalogOption[] = [{ id: SHARED_CATALOG_ID, name: "Catálogo principal", isShared: true, ownerId: null, movieCount: 0 }];

  const query: CatalogQuery = {
    catalogId: catalog.id,
    tab: p.tab,
    q: p.q,
    genres: p.genres,
    countries: p.countries,
    yearFrom: p.yearFrom,
    yearTo: p.yearTo,
    cast: p.cast,
    director: p.director,
    company: p.company,
    mediaType: p.mediaType,
    location: p.location,
    shelf: p.shelf,
  };

  const hasFilters =
    query.genres.length > 0 ||
    query.countries.length > 0 ||
    Boolean(query.yearFrom) ||
    Boolean(query.yearTo) ||
    Boolean(query.cast) ||
    Boolean(query.director) ||
    Boolean(query.company) ||
    Boolean(query.mediaType) ||
    Boolean(query.location) ||
    Boolean(query.shelf);

  let movies: Awaited<ReturnType<typeof getCatalog>>["movies"] = [];
  let totalPages = 1;
  let counts: Record<string, number> = {};
  let facets = EMPTY_FACETS;
  let dbError = false;

  try {
    const active = await resolveCurrentCatalog(user);
    catalog = active;
    query.catalogId = active.id;

    const [catalogResult, tabCounts, f, accessible] = await Promise.all([
      getCatalog(query, p.sort, p.page),
      getTabCounts(query),
      getFacets(active.id),
      listAccessibleCatalogs(user),
    ]);
    const groups = await prisma.movie.groupBy({
      by: ["catalogId"],
      where: { catalogId: { in: accessible.map((c) => c.id) } },
      _count: { _all: true },
    });
    const countMap = new Map(groups.map((g) => [g.catalogId, g._count._all]));

    movies = catalogResult.movies;
    totalPages = catalogResult.totalPages;
    counts = tabCounts;
    facets = f;
    catalogs = accessible.map((c) => ({ ...c, movieCount: countMap.get(c.id) ?? 0 }));
  } catch (err) {
    console.error("Erro ao ler catálogo:", err);
    dbError = true;
  }

  // catálogo vazio e sem filtros → sugere tendências da semana para começar
  let trending: MovieCardData[] = [];
  if (!dbError && movies.length === 0 && !hasFilters && p.tab === "all" && !p.q) {
    try {
      const t = await getTrending();
      trending = t.results.slice(0, 12).map((m) => ({
        tmdbId: m.id,
        title: m.title,
        posterPath: m.poster_path,
        releaseDate: m.release_date,
        voteAverage: m.vote_average,
      }));
    } catch {
      // TMDB indisponível: apenas não exibe sugestões
    }
  }

  const buildHref = (page: number) => {
    const sp = new URLSearchParams();
    if (p.tab !== "all") sp.set("tab", p.tab);
    if (p.q) sp.set("q", p.q);
    if (p.genres.length) sp.set("genres", p.genres.join(","));
    if (p.countries.length) sp.set("countries", p.countries.join(","));
    if (p.yearFrom) sp.set("yearFrom", String(p.yearFrom));
    if (p.yearTo) sp.set("yearTo", String(p.yearTo));
    if (p.cast) sp.set("cast", p.cast);
    if (p.director) sp.set("director", p.director);
    if (p.company) sp.set("company", p.company);
    if (p.mediaType) sp.set("mediaType", p.mediaType);
    if (p.location) sp.set("location", p.location);
    if (p.shelf) sp.set("shelf", p.shelf);
    if (p.sort !== "recent") sp.set("sort", p.sort);
    if (page > 1) sp.set("page", String(page));
    return sp.size > 0 ? `/?${sp.toString()}` : "/";
  };

  const tabTitle =
    p.tab === "all" ? catalog.name : p.tab === "favorites" ? "Favoritos" : p.tab === "watchlist" ? "Para assistir" : "Assistidos";

  return (
    <div className="space-y-6">
      <section aria-labelledby="titulo-catalogo" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 id="titulo-catalogo" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {tabTitle}
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              {catalogs.find((c) => c.id === catalog.id)?.movieCount ?? 0} filmes neste catálogo
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CatalogSwitcher catalogs={catalogs} activeId={catalog.id} currentUserId={user.id} />
            <Suspense fallback={null}>
              <ReportButton />
            </Suspense>
            <Suspense fallback={null}>
              <SortSelect />
            </Suspense>
            <Link
              href="/filme/novo"
              className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent hover:text-black"
            >
              <PenLine className="h-4 w-4" aria-hidden="true" />
              Cadastrar manualmente
            </Link>
          </div>
        </div>

        <Suspense fallback={null}>
          <CatalogTabs counts={counts} />
        </Suspense>

        {/* filtro por título dentro do catálogo */}
        <form action="/" method="get" role="search" className="flex gap-2">
          {p.tab !== "all" && <input type="hidden" name="tab" value={p.tab} />}
          {p.sort !== "recent" && <input type="hidden" name="sort" value={p.sort} />}
          {p.genres.length > 0 && <input type="hidden" name="genres" value={p.genres.join(",")} />}
          {p.countries.length > 0 && <input type="hidden" name="countries" value={p.countries.join(",")} />}
          {p.yearFrom && <input type="hidden" name="yearFrom" value={p.yearFrom} />}
          {p.yearTo && <input type="hidden" name="yearTo" value={p.yearTo} />}
          {p.cast && <input type="hidden" name="cast" value={p.cast} />}
          {p.director && <input type="hidden" name="director" value={p.director} />}
          {p.company && <input type="hidden" name="company" value={p.company} />}
          {p.mediaType && <input type="hidden" name="mediaType" value={p.mediaType} />}
          {p.location && <input type="hidden" name="location" value={p.location} />}
          {p.shelf && <input type="hidden" name="shelf" value={p.shelf} />}
          <input
            type="search"
            name="q"
            defaultValue={p.q}
            placeholder="Filtrar por título, direção ou anotações…"
            aria-label="Filtrar catálogo por texto"
            maxLength={80}
            className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-zinc-500 focus:border-accent/60"
          />
        </form>

        <Suspense fallback={null}>
          <FiltersPanel facets={facets} />
        </Suspense>
      </section>

      {dbError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Não foi possível conectar ao banco de dados.</p>
            <p className="mt-1 text-amber-400/80">
              Verifique se <code className="rounded bg-black/30 px-1">DATABASE_URL</code> está configurada corretamente
              (Vercel → Environment Variables) e se o PostgreSQL do Neon está ativo. A busca no TMDB continua funcionando.
            </p>
          </div>
        </div>
      )}

      {!dbError && movies.length === 0 && trending.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <SearchX className="h-10 w-10 text-zinc-600" aria-hidden="true" />
          <p className="text-zinc-400">
            {hasFilters || p.q
              ? "Nenhum filme do catálogo corresponde aos filtros atuais."
              : p.tab === "all"
                ? "Este catálogo está vazio."
                : "Nada por aqui ainda."}
          </p>
          <p className="max-w-md text-sm text-zinc-500">
            {hasFilters
              ? "Tente remover alguns filtros ou usar a busca no topo para encontrar filmes no TMDB."
              : "Use a busca no topo para encontrar filmes no TMDB, ou cadastre manualmente um filme que não esteja nos catálogos oficiais."}
          </p>
          {!hasFilters && !p.q && (
            <Link
              href="/filme/novo"
              className="mt-1 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent hover:text-black"
            >
              <PenLine className="h-4 w-4" aria-hidden="true" />
              Cadastrar filme manualmente
            </Link>
          )}
        </div>
      )}

      {movies.length > 0 && (
        <>
          <ul className={GRID_CLASS} aria-label="Filmes do catálogo">
            {movies.map((m) => (
              <li key={m.id}>
                <MovieCard
                  movie={{
                    id: m.id,
                    tmdbId: m.tmdbId,
                    source: m.source,
                    title: m.title,
                    posterPath: m.posterPath,
                    releaseDate: m.releaseDate,
                    voteAverage: m.voteAverage,
                    inCatalog: true,
                    favorite: m.favorite,
                    watchlist: m.watchlist,
                    watched: m.watched,
                  }}
                />
              </li>
            ))}
          </ul>
          <Pagination page={p.page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}

      {trending.length > 0 && (
        <section aria-labelledby="titulo-tendencias" className="space-y-4">
          <h2 id="titulo-tendencias" className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
            Em alta esta semana — comece seu catálogo
          </h2>
          <ul className={GRID_CLASS} aria-label="Filmes em alta no TMDB">
            {trending.map((m) => (
              <li key={m.tmdbId ?? m.title}>
                <MovieCard movie={m} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
