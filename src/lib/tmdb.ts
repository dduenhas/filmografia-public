import type {
  MovieDetailsPayload,
  OmdbResponse,
  TmdbCredits,
  TmdbMovieDetails,
  TmdbSearchResponse,
  TmdbVideo,
  TmdbWatchProviders,
} from "@/types/tmdb";

const TMDB_BASE = "https://api.themoviedb.org/3";
const LANGUAGE = "pt-BR";
const REGION = "BR";

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function tmdbImageUrl(path: string | null, size: "w185" | "w342" | "w500" | "w780" | "w1280" | "original" = "w500"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Resolve a URL de imagem de um filme do catálogo.
 * - Filmes do TMDB guardam um caminho relativo (ex.: "/abc.jpg") → monta a URL do TMDB.
 * - Filmes manuais guardam uma URL absoluta (http/https) → retorna como está.
 */
export function resolveImageUrl(value: string | null | undefined, size: "w185" | "w342" | "w500" | "w780" | "w1280" | "original" = "w500"): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return tmdbImageUrl(value, size);
}

/** true quando o valor é uma URL externa absoluta (imagem de cadastro manual). */
export function isAbsoluteUrl(value: string | null | undefined): boolean {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB_API_KEY não configurada no ambiente");
  }
  return key;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}, revalidate = 86400): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("language", LANGUAGE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { next: { revalidate } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDB ${res.status} em ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function searchMovies(query: string, page = 1): Promise<TmdbSearchResponse> {
  return tmdbFetch<TmdbSearchResponse>("/search/movie", { query, page: String(page) }, 3600);
}

export async function getTrending(): Promise<TmdbSearchResponse> {
  return tmdbFetch<TmdbSearchResponse>("/trending/movie/week", {}, 21600);
}

export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, { region: REGION });
}

export async function getMovieCredits(tmdbId: number): Promise<TmdbCredits> {
  return tmdbFetch<TmdbCredits>(`/movie/${tmdbId}/credits`);
}

export async function getMovieVideos(tmdbId: number): Promise<{ results: TmdbVideo[] }> {
  return tmdbFetch<{ results: TmdbVideo[] }>(`/movie/${tmdbId}/videos`);
}

export async function getWatchProviders(tmdbId: number): Promise<TmdbWatchProviders> {
  return tmdbFetch<TmdbWatchProviders>(`/movie/${tmdbId}/watch/providers`, { region: REGION }, 43200);
}

/**
 * OMDb como fonte complementar (nota IMDb oficial, prêmios, classificação).
 * Opcional: só é chamado se OMDB_API_KEY estiver configurada.
 * Cadastro gratuito em https://www.omdbapi.com/apikey.aspx
 */
async function fetchOmdb(imdbId: string): Promise<OmdbResponse | null> {
  const key = process.env.OMDB_API_KEY;
  if (!key || !imdbId) return null;
  try {
    const url = new URL("https://www.omdbapi.com/");
    url.searchParams.set("apikey", key);
    url.searchParams.set("i", imdbId);
    url.searchParams.set("plot", "short");
    const res = await fetch(url.toString(), { next: { revalidate: 604800 } });
    if (!res.ok) return null;
    const data = (await res.json()) as OmdbResponse;
    return data.Response === "True" ? data : null;
  } catch {
    return null; // enriquecimento opcional nunca deve quebrar a página
  }
}

function pickTrailer(videos: TmdbVideo[]): { trailerKey: string | null; videos: { key: string; name: string; type: string }[] } {
  const yt = videos
    .filter((v) => v.site === "YouTube")
    .sort((a, b) => Number(b.official) - Number(a.official) || b.published_at.localeCompare(a.published_at));
  const trailer = yt.find((v) => v.type === "Trailer") ?? yt.find((v) => v.type === "Teaser") ?? null;
  return {
    trailerKey: trailer?.key ?? null,
    videos: yt.slice(0, 6).map((v) => ({ key: v.key, name: v.name, type: v.type })),
  };
}

/** Agrega detalhes + créditos + vídeos + onde assistir + OMDb num payload único */
export async function getFullMovieDetails(tmdbId: number): Promise<MovieDetailsPayload> {
  const [details, credits, videosRes, providersRes] = await Promise.all([
    getMovieDetails(tmdbId),
    getMovieCredits(tmdbId),
    getMovieVideos(tmdbId).catch(() => ({ results: [] as TmdbVideo[] })),
    getWatchProviders(tmdbId).catch(() => ({ results: {} }) as TmdbWatchProviders),
  ]);

  const omdb = details.imdb_id ? await fetchOmdb(details.imdb_id) : null;
  const { trailerKey, videos } = pickTrailer(videosRes.results);

  const director = credits.crew.find((c) => c.job === "Director")?.name ?? null;
  const br = providersRes.results?.BR;

  const mapProviders = (list?: { provider_name: string; logo_path: string | null }[]) =>
    (list ?? []).map((p) => ({ name: p.provider_name, logoPath: p.logo_path }));

  return {
    tmdbId: details.id,
    imdbId: details.imdb_id ?? omdb?.imdbID ?? null,
    title: details.title,
    originalTitle: details.original_title,
    overview: details.overview || omdb?.Plot || "",
    tagline: details.tagline,
    posterPath: details.poster_path,
    backdropPath: details.backdrop_path,
    releaseDate: details.release_date,
    runtime: details.runtime,
    genres: details.genres.map((g) => g.name),
    countries: (details.production_countries ?? []).map((c) => c.name),
    castNames: credits.cast.slice(0, 15).map((c) => c.name),
    productionCompanies: (details.production_companies ?? []).map((c) => c.name).slice(0, 10),
    voteAverage: details.vote_average,
    voteCount: details.vote_count,
    imdbRating: omdb?.imdbRating && omdb.imdbRating !== "N/A" ? omdb.imdbRating : null,
    rated: omdb?.Rated && omdb.Rated !== "N/A" ? omdb.Rated : null,
    awards: omdb?.Awards && omdb.Awards !== "N/A" ? omdb.Awards : null,
    director,
    cast: credits.cast.slice(0, 12).map((c) => ({ name: c.name, character: c.character, profilePath: c.profile_path })),
    trailerKey,
    videos,
    watchProviders: {
      link: br?.link ?? null,
      flatrate: mapProviders(br?.flatrate),
      rent: mapProviders(br?.rent),
      buy: mapProviders(br?.buy),
    },
    homepage: details.homepage || null,
  };
}
