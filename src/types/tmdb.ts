// Tipos das respostas da API do TMDB (v3)

export interface TmdbMovieSummary {
  id: number;
  imdb_id?: string | null;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult?: boolean;
  genre_ids?: number[];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovieDetails extends TmdbMovieSummary {
  tagline: string | null;
  runtime: number | null;
  status: string;
  genres: TmdbGenre[];
  homepage: string | null;
  production_countries?: { iso_3166_1: string; name: string }[];
  production_companies?: { id: number; name: string }[];
  spoken_languages?: { english_name: string }[];
  budget?: number;
  revenue?: number;
}

export interface TmdbCredits {
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
  crew: {
    id: number;
    name: string;
    job: string;
    profile_path: string | null;
  }[];
}

export interface TmdbVideo {
  key: string;
  name: string;
  site: string; // "YouTube"
  type: string; // "Trailer", "Teaser", etc.
  official: boolean;
  published_at: string;
}

export interface TmdbWatchProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
}

export interface TmdbWatchProviders {
  results: {
    BR?: {
      link?: string;
      flatrate?: TmdbWatchProviderEntry[];
      rent?: TmdbWatchProviderEntry[];
      buy?: TmdbWatchProviderEntry[];
      free?: TmdbWatchProviderEntry[];
      ads?: TmdbWatchProviderEntry[];
    };
  };
}

export interface TmdbSearchResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbMovieSummary[];
}

export interface OmdbResponse {
  Response: "True" | "False";
  imdbID?: string;
  imdbRating?: string;
  imdbVotes?: string;
  Rated?: string; // classificação indicativa
  Awards?: string;
  Director?: string;
  Writer?: string;
  Plot?: string;
  Year?: string;
  Runtime?: string;
}

// Payload normalizado enviado ao client
export interface MovieDetailsPayload {
  tmdbId: number;
  imdbId: string | null;
  title: string;
  originalTitle: string;
  overview: string;
  tagline: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  genres: string[];
  countries: string[];
  castNames: string[];
  productionCompanies: string[];
  voteAverage: number;
  voteCount: number;
  imdbRating: string | null;
  rated: string | null;
  awards: string | null;
  director: string | null;
  cast: { name: string; character: string; profilePath: string | null }[];
  trailerKey: string | null;
  videos: { key: string; name: string; type: string }[];
  watchProviders: {
    link: string | null;
    flatrate: { name: string; logoPath: string | null }[];
    rent: { name: string; logoPath: string | null }[];
    buy: { name: string; logoPath: string | null }[];
  };
  homepage: string | null;
}
