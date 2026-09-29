import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, SearchX, TriangleAlert } from "lucide-react";
import { getCatalog, getFacets, getTabCounts, type CatalogQuery, type CatalogSort, type CatalogTab, type Facets } from "@/lib/catalog";
import { catalogQuerySchema } from "@/lib/validation";
import { getPublicCatalogByToken } from "@/lib/catalogs";
import { MovieCard } from "@/components/movie-card";
import { CatalogTabs } from "@/components/catalog-tabs";
import { SortSelect } from "@/components/sort-select";
import { Pagination } from "@/components/pagination";
import { FiltersPanel } from "@/components/filters-panel";

// Sempre dinâmico: lê o PostgreSQL a cada request (catálogo público atualizado em tempo real)
export const dynamic = "force-dynamic";

const GRID_CLASS = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
const EMPTY_FACETS: Facets = { genres: [], countries: [], cast: [], directors: [], companies: [], years: [], locations: [], shelves: [] };

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Visualização pública somente-leitura de um catálogo (link compartilhado). */
export default async function PublicCatalogPage({ params, searchParams }: Props) {
  const { token } = await params;
  const catalog = await getPublicCatalogByToken(token).catch(() => null);
  if (!catalog) notFound();

  const basePath = `/c/${token}`;

  const raw = await searchParams;
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
    const [catalogResult, tabCounts, f] = await Promise.all([getCatalog(query, p.sort, p.page), getTabCounts(query), getFacets(catalog.id)]);
    movies = catalogResult.movies;
    totalPages = catalogResult.totalPages;
    counts = tabCounts;
    facets = f;
  } catch (err) {
    console.error("Erro ao ler catálogo público:", err);
    dbError = true;
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
    return sp.size > 0 ? `${basePath}?${sp.toString()}` : basePath;
  };

  const tabTitle =
    p.tab === "all" ? catalog.name : p.tab === "favorites" ? "Favoritos" : p.tab === "watchlist" ? "Para assistir" : "Assistidos";

  return (
    <div className="space-y-6">
      <section aria-labelledby="titulo-catalogo-publico" className="space-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 id="titulo-catalogo-publico" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {tabTitle}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Visualização pública · somente leitura
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {counts.all ?? 0} filmes neste catálogo · você pode pesquisar e filtrar, mas não editar.
          </p>
        </div>

        <CatalogTabs counts={counts} basePath={basePath} />

        {/* filtro por título dentro do catálogo (banco local, sem APIs externas) */}
        <form action={basePath} method="get" role="search" className="flex gap-2">
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

        <FiltersPanel facets={facets} basePath={basePath} />

        <div className="flex justify-end">
          <SortSelect basePath={basePath} />
        </div>
      </section>

      {dbError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>Não foi possível conectar ao banco de dados agora. Tente novamente em instantes.</p>
        </div>
      )}

      {!dbError && movies.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <SearchX className="h-10 w-10 text-zinc-600" aria-hidden="true" />
          <p className="text-zinc-400">
            {hasFilters || p.q ? "Nenhum filme corresponde aos filtros atuais." : "Este catálogo está vazio."}
          </p>
          {hasFilters || p.q ? (
            <Link href={basePath} className="text-sm text-accent hover:underline">
              Limpar filtros
            </Link>
          ) : null}
        </div>
      )}

      {movies.length > 0 && (
        <>
          <ul className={GRID_CLASS} aria-label="Filmes do catálogo">
            {movies.map((m) => (
              <li key={m.id}>
                <MovieCard
                  readOnly
                  href={`${basePath}/filme/${m.id}`}
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
    </div>
  );
}
