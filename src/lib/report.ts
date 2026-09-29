import type { Movie } from "@/generated/prisma/client";

// Geração de relatórios CSV (compatível com Excel/Google Sheets: BOM UTF-8 + separador ";").

const HEADERS = [
  "Título",
  "Título original",
  "Ano",
  "Duração (min)",
  "Gêneros",
  "Países",
  "Direção",
  "Elenco (principais)",
  "Produtoras",
  "Nota TMDB",
  "Sua nota",
  "Favorito",
  "Para assistir",
  "Assistido",
  "Assistido em",
  "Anotações",
  "Adicionado por",
  "Adicionado em",
  "Origem",
  "IMDb",
  "TMDB",
  "Trailer",
  "Site",
  "Local",
  "Estante",
  "Prateleira",
  "Numeração",
  "Tipo de mídia",
  "URL da mídia",
];

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value).replace(/"/g, '""');
  return `"${s}"`;
}

function dateBR(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function buildCatalogCsv(movies: Movie[]): string {
  const rows = movies.map((m) =>
    [
      cell(m.title),
      cell(m.originalTitle),
      cell(m.releaseDate ? m.releaseDate.getUTCFullYear() : null),
      cell(m.runtime),
      cell(m.genres.join(", ")),
      cell(m.countries.join(", ")),
      cell(m.director),
      cell(m.cast.slice(0, 8).join(", ")),
      cell(m.productionCompanies.join(", ")),
      cell(m.voteAverage !== null ? m.voteAverage.toFixed(1) : null),
      cell(m.personalRating !== null ? String(m.personalRating) : null),
      cell(m.favorite ? "Sim" : "Não"),
      cell(m.watchlist ? "Sim" : "Não"),
      cell(m.watched ? "Sim" : "Não"),
      cell(dateBR(m.watchedAt)),
      cell(m.notes),
      cell(m.addedBy),
      cell(dateBR(m.createdAt)),
      cell(m.source === "MANUAL" ? "Manual" : "TMDB"),
      cell(m.imdbId ? `https://www.imdb.com/title/${m.imdbId}/` : null),
      cell(m.tmdbId ? `https://www.themoviedb.org/movie/${m.tmdbId}` : null),
      cell(m.trailerUrl),
      cell(m.homepage),
      cell(m.location),
      cell(m.shelf),
      cell(m.rack),
      cell(m.numbering),
      cell(m.mediaType),
      cell(m.mediaUrl),
    ].join(";"),
  );

  const csv = [HEADERS.join(";"), ...rows].join("\r\n");
  return `\uFEFF${csv}`; // BOM para acentos no Excel
}
