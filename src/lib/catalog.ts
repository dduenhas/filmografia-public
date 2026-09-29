import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const PAGE_SIZE = 24;
export const REPORT_LIMIT = 5000;

export type CatalogTab = "all" | "favorites" | "watchlist" | "watched";
export type CatalogSort = "recent" | "title" | "rating" | "personal" | "release_desc" | "release_asc" | "runtime";

export interface CatalogQuery {
  catalogId: string;
  tab: CatalogTab;
  q: string;
  genres: string[];
  countries: string[];
  yearFrom?: number;
  yearTo?: number;
  cast: string;
  director: string;
  company: string;
  mediaType: string;
  location: string;
  shelf: string;
}

const SORT_MAP: Record<CatalogSort, Prisma.MovieOrderByWithRelationInput[]> = {
  recent: [{ createdAt: "desc" }],
  title: [{ title: "asc" }],
  rating: [{ voteAverage: { sort: "desc", nulls: "last" } }, { title: "asc" }],
  personal: [{ personalRating: { sort: "desc", nulls: "last" } }, { title: "asc" }],
  release_desc: [{ releaseDate: { sort: "desc", nulls: "last" } }, { title: "asc" }],
  release_asc: [{ releaseDate: { sort: "asc", nulls: "last" } }, { title: "asc" }],
  runtime: [{ runtime: { sort: "desc", nulls: "last" } }, { title: "asc" }],
};

/** Query com os termos de elenco/produtora já resolvidos para valores exatos do catálogo. */
interface ResolvedQuery extends CatalogQuery {
  castMatch: string[];
  companyMatch: string[];
  noMatch: boolean;
}

/** Busca parcial (ILIKE) em arrays: resolve "Keanu" → ["Keanu Reeves", ...] presentes no catálogo. */
async function matchArrayValues(catalogId: string, column: string, term: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ value: string }[]>`
    SELECT DISTINCT u AS value
    FROM "Movie" m, unnest(m.${Prisma.raw(column)}) AS u
    WHERE m."catalogId" = ${catalogId} AND u ILIKE ${`%${term}%`}`;
  return rows.map((r) => r.value);
}

/** Expande cast/company (busca parcial) em valores exatos; diretor já é "contains". */
async function resolveQuery(query: CatalogQuery): Promise<ResolvedQuery> {
  const [castMatch, companyMatch] = await Promise.all([
    query.cast ? matchArrayValues(query.catalogId, '"cast"', query.cast) : Promise.resolve<string[]>([]),
    query.company ? matchArrayValues(query.catalogId, '"productionCompanies"', query.company) : Promise.resolve<string[]>([]),
  ]);
  const noMatch = (Boolean(query.cast) && castMatch.length === 0) || (Boolean(query.company) && companyMatch.length === 0);
  return { ...query, castMatch, companyMatch, noMatch };
}

/** Monta o WHERE combinando aba + busca textual + todos os filtros. */
export function buildWhere(query: ResolvedQuery, opts: { withTab?: boolean } = {}): Prisma.MovieWhereInput {
  const { withTab = true } = opts;
  const where: Prisma.MovieWhereInput = { catalogId: query.catalogId };

  // termo de elenco/produtora sem correspondência → resultado vazio
  if (query.noMatch) {
    where.id = "__sem_correspondencia__";
    return where;
  }

  if (withTab) {
    if (query.tab === "favorites") where.favorite = true;
    if (query.tab === "watchlist") where.watchlist = true;
    if (query.tab === "watched") where.watched = true;
  }

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { originalTitle: { contains: query.q, mode: "insensitive" } },
      { director: { contains: query.q, mode: "insensitive" } },
      { notes: { contains: query.q, mode: "insensitive" } },
    ];
  }

  if (query.genres.length > 0) where.genres = { hasSome: query.genres };
  if (query.countries.length > 0) where.countries = { hasSome: query.countries };

  if (query.yearFrom || query.yearTo) {
    where.releaseDate = {};
    if (query.yearFrom) where.releaseDate.gte = new Date(`${query.yearFrom}-01-01T00:00:00Z`);
    if (query.yearTo) where.releaseDate.lte = new Date(`${query.yearTo}-12-31T23:59:59Z`);
  }

  if (query.castMatch.length > 0) where.cast = { hasSome: query.castMatch };
  if (query.director) where.director = { contains: query.director, mode: "insensitive" };
  if (query.companyMatch.length > 0) where.productionCompanies = { hasSome: query.companyMatch };

  // localização física / mídia da cópia
  if (query.mediaType) where.mediaType = query.mediaType;
  if (query.location) where.location = { contains: query.location, mode: "insensitive" };
  if (query.shelf) where.shelf = { contains: query.shelf, mode: "insensitive" };

  return where;
}

export async function getCatalog(query: CatalogQuery, sort: CatalogSort, page: number) {
  const where = buildWhere(await resolveQuery(query));
  const [movies, total] = await Promise.all([
    prisma.movie.findMany({
      where,
      orderBy: SORT_MAP[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.movie.count({ where }),
  ]);
  return { movies, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Mesmos filtros do catálogo, sem paginação (para relatórios). */
export async function getMoviesForReport(query: CatalogQuery) {
  return prisma.movie.findMany({
    where: buildWhere(await resolveQuery(query)),
    orderBy: SORT_MAP.title,
    take: REPORT_LIMIT,
  });
}

/** Contagens das abas respeitando os filtros ativos (exceto a própria aba). */
export async function getTabCounts(query: CatalogQuery) {
  const base = buildWhere(await resolveQuery(query), { withTab: false });
  const [all, favorites, watchlist, watched] = await Promise.all([
    prisma.movie.count({ where: base }),
    prisma.movie.count({ where: { ...base, favorite: true } }),
    prisma.movie.count({ where: { ...base, watchlist: true } }),
    prisma.movie.count({ where: { ...base, watched: true } }),
  ]);
  return { all, favorites, watchlist, watched };
}

export interface Facets {
  genres: string[];
  countries: string[];
  cast: string[];
  directors: string[];
  companies: string[];
  years: number[];
  locations: string[];
  shelves: string[];
}

/** Valores distintos reais do catálogo para alimentar os filtros (autocomplete). */
export async function getFacets(catalogId: string): Promise<Facets> {
  // COLLATE "und-x-icu" → ordem alfabética ICU (ignora maiúsculas/minúsculas e acentos);
  // única collation ICU disponível por padrão no Neon/PostgreSQL.
  // O DISTINCT fica num subselect: com SELECT DISTINCT o ORDER BY ... COLLATE não casa
  // com a lista de seleção e o PostgreSQL tenta resolver o alias contra a tabela (42703).
  const alpha = Prisma.raw(`COLLATE "und-x-icu"`);
  const facet = (expr: Prisma.Sql, extra: Prisma.Sql = Prisma.empty) =>
    prisma.$queryRaw<{ value: string }[]>`
      SELECT value FROM (
        SELECT DISTINCT ${expr} AS value FROM "Movie"
        WHERE "catalogId" = ${catalogId} ${extra}
      ) AS t ORDER BY value ${alpha}`;
  const [genres, countries, cast, companies, directors, years, locations, shelves] = await Promise.all([
    facet(Prisma.sql`unnest(genres)`),
    facet(Prisma.sql`unnest(countries)`),
    // "cast" é palavra reservada do PostgreSQL (CAST(x AS t)) → precisa de aspas duplas
    facet(Prisma.sql`unnest("cast")`),
    facet(Prisma.sql`unnest("productionCompanies")`),
    facet(Prisma.sql`director`, Prisma.sql`AND director IS NOT NULL AND director <> ''`),
    prisma.$queryRaw<{ year: number }[]>`SELECT DISTINCT EXTRACT(YEAR FROM "releaseDate")::int AS year FROM "Movie" WHERE "catalogId" = ${catalogId} AND "releaseDate" IS NOT NULL ORDER BY year DESC`,
    facet(Prisma.sql`location`, Prisma.sql`AND location IS NOT NULL AND location <> ''`),
    facet(Prisma.sql`shelf`, Prisma.sql`AND shelf IS NOT NULL AND shelf <> ''`),
  ]);
  return {
    genres: genres.map((g) => g.value),
    countries: countries.map((c) => c.value),
    cast: cast.map((c) => c.value),
    directors: directors.map((d) => d.value),
    companies: companies.map((c) => c.value),
    years: years.map((y) => y.year),
    locations: locations.map((l) => l.value),
    shelves: shelves.map((s) => s.value),
  };
}

// ---------- Dashboard ----------

export async function getDashboardStats(catalogId: string) {
  const [total, favorites, watchlist, watched, avgPersonal, genresByCount, countriesByCount, recentAdded] =
    await Promise.all([
      prisma.movie.count({ where: { catalogId } }),
      prisma.movie.count({ where: { catalogId, favorite: true } }),
      prisma.movie.count({ where: { catalogId, watchlist: true } }),
      prisma.movie.count({ where: { catalogId, watched: true } }),
      prisma.movie.aggregate({ where: { catalogId }, _avg: { personalRating: true, voteAverage: true } }),
      prisma.$queryRaw<{ genre: string; count: bigint }[]>`
        SELECT g AS genre, COUNT(*) AS count FROM "Movie", unnest(genres) AS g
        WHERE "catalogId" = ${catalogId}
        GROUP BY g ORDER BY count DESC LIMIT 8`,
      prisma.$queryRaw<{ country: string; count: bigint }[]>`
        SELECT c AS country, COUNT(*) AS count FROM "Movie", unnest(countries) AS c
        WHERE "catalogId" = ${catalogId}
        GROUP BY c ORDER BY count DESC LIMIT 6`,
      prisma.movie.findMany({
        where: { catalogId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, tmdbId: true, title: true, posterPath: true, source: true, releaseDate: true, voteAverage: true, addedBy: true, createdAt: true },
      }),
    ]);

  return {
    total,
    favorites,
    watchlist,
    watched,
    avgPersonal: avgPersonal._avg.personalRating,
    avgTmdb: avgPersonal._avg.voteAverage,
    genres: genresByCount.map((g) => ({ genre: g.genre, count: Number(g.count) })),
    countries: countriesByCount.map((c) => ({ country: c.country, count: Number(c.count) })),
    recentAdded,
  };
}
