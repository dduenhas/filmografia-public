import Link from "next/link";
import { Bookmark, Check, Heart, PenLine, Star } from "lucide-react";
import { resolveImageUrl } from "@/lib/tmdb";
import { movieHref } from "@/lib/movie-link";
import { formatRating, releaseYear } from "@/lib/format";
import { CatalogImage } from "@/components/catalog-image";
import { PlaceholderImage } from "@/components/placeholder-image";
import { AddToCatalogButton } from "@/components/add-to-catalog";

export interface MovieCardData {
  id?: string;
  tmdbId: number | null;
  source?: string;
  title: string;
  posterPath: string | null;
  releaseDate: string | Date | null;
  voteAverage: number | null;
  inCatalog?: boolean;
  favorite?: boolean;
  watchlist?: boolean;
  watched?: boolean;
}

export function MovieCard({ movie }: { movie: MovieCardData }) {
  const posterUrl = resolveImageUrl(movie.posterPath, "w342");
  const year = releaseYear(movie.releaseDate);
  const href = movieHref(movie);
  const isManual = movie.source === "MANUAL" || (movie.tmdbId == null && Boolean(movie.id));

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-surface transition duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-black/40">
      <Link href={href} className="relative block aspect-[2/3] w-full overflow-hidden bg-surface-2" tabIndex={-1} aria-hidden="true">
        {posterUrl ? (
          <CatalogImage
            src={posterUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <PlaceholderImage
            variant="poster"
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
            className="object-cover"
          />
        )}
      </Link>

      {/* selos de status */}
      <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1.5">
        {isManual && (
          <span className="rounded-full bg-black/70 p-1.5 text-violet-300 backdrop-blur-sm" title="Cadastro manual">
            <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Cadastro manual</span>
          </span>
        )}
        {movie.favorite && (
          <span className="rounded-full bg-black/70 p-1.5 text-red-400 backdrop-blur-sm" title="Favorito">
            <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span className="sr-only">Favorito</span>
          </span>
        )}
        {movie.watchlist && (
          <span className="rounded-full bg-black/70 p-1.5 text-sky-400 backdrop-blur-sm" title="Para assistir">
            <Bookmark className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span className="sr-only">Para assistir</span>
          </span>
        )}
        {movie.watched && (
          <span className="rounded-full bg-black/70 p-1.5 text-emerald-400 backdrop-blur-sm" title="Assistido">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Assistido</span>
          </span>
        )}
      </div>

      {/* nota TMDB */}
      {movie.voteAverage !== null && movie.voteAverage > 0 && (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-xs font-semibold text-accent backdrop-blur-sm">
          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
          {formatRating(movie.voteAverage)}
          <span className="sr-only">de 10</span>
        </span>
      )}

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={href} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-accent">
          {movie.title}
          <span className="ml-1.5 font-normal text-zinc-500">{year !== "—" ? `(${year})` : ""}</span>
        </Link>
        <div className="mt-auto">
          {movie.tmdbId != null ? (
            <AddToCatalogButton tmdbId={movie.tmdbId} inCatalog={movie.inCatalog} className="w-full justify-center" />
          ) : (
            <Link
              href={href}
              className="flex w-full items-center justify-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
            >
              <PenLine className="h-3.5 w-3.5" aria-hidden="true" /> Ver / editar
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
