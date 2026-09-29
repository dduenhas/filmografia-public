// Roteamento de filmes: TMDB usa /movie/[tmdbId]; cadastro manual usa /filme/[id].
export interface MovieLinkData {
  id?: string;
  tmdbId?: number | null;
  source?: string;
}

/** URL de detalhes do filme conforme a origem (TMDB ou manual). */
export function movieHref(movie: MovieLinkData): string {
  const isManual = movie.source === "MANUAL" || (movie.tmdbId == null && Boolean(movie.id));
  if (isManual && movie.id) return `/filme/${movie.id}`;
  if (movie.tmdbId != null) return `/movie/${movie.tmdbId}`;
  return movie.id ? `/filme/${movie.id}` : "/";
}
