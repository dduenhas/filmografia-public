import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink, PenLine, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSession } from "@/lib/auth";
import { canViewCatalog } from "@/lib/catalogs";
import { resolveImageUrl } from "@/lib/tmdb";
import { formatDateBR, formatRating, formatRuntime, releaseYear } from "@/lib/format";
import { CatalogImage } from "@/components/catalog-image";
import { PlaceholderImage } from "@/components/placeholder-image";
import { MovieActions } from "@/components/movie-actions";
import { ManualMovieEditor } from "@/components/manual-movie-editor";
import type { ManualMovieFormValues } from "@/components/manual-movie-form";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const movie = await prisma.movie.findUnique({ where: { id }, select: { title: true } }).catch(() => null);
  return { title: movie?.title ?? "Filme", robots: { index: false, follow: false } };
}

export default async function ManualMoviePage({ params }: Props) {
  const { id } = await params;
  const user = await getActiveUser(await getSession());
  if (!user) redirect("/login");

  let movie;
  try {
    movie = await prisma.movie.findUnique({
      where: { id },
      include: { catalog: { select: { isShared: true, ownerId: true, name: true, owner: { select: { role: true } } } } },
    });
  } catch (err) {
    console.error("Erro ao carregar filme:", err);
    notFound();
  }
  if (!movie || !canViewCatalog(user, movie.catalog)) notFound();

  // filmes do TMDB têm página própria
  if (movie.source !== "MANUAL" && movie.tmdbId != null) redirect(`/movie/${movie.tmdbId}`);

  const posterUrl = resolveImageUrl(movie.posterPath, "w500");
  const backdropUrl = resolveImageUrl(movie.backdropPath, "w1280");
  const year = releaseYear(movie.releaseDate);

  const initial: ManualMovieFormValues = {
    title: movie.title,
    originalTitle: movie.originalTitle ?? "",
    tagline: movie.tagline ?? "",
    overview: movie.overview ?? "",
    releaseDate: movie.releaseDate ? movie.releaseDate.toISOString().slice(0, 10) : "",
    runtime: movie.runtime != null ? String(movie.runtime) : "",
    voteAverage: movie.voteAverage != null ? String(movie.voteAverage) : "",
    director: movie.director ?? "",
    genres: movie.genres.join(", "),
    countries: movie.countries.join(", "),
    cast: movie.cast.join(", "),
    productionCompanies: movie.productionCompanies.join(", "),
    posterUrl: movie.posterPath?.startsWith("http") ? movie.posterPath : "",
    backdropUrl: movie.backdropPath?.startsWith("http") ? movie.backdropPath : "",
    trailerUrl: movie.trailerUrl ?? "",
    homepage: movie.homepage ?? "",
    imdbId: movie.imdbId ?? "",
    location: movie.location ?? "",
    shelf: movie.shelf ?? "",
    rack: movie.rack ?? "",
    numbering: movie.numbering ?? "",
    mediaType: movie.mediaType ?? "",
    mediaUrl: movie.mediaUrl ?? "",
  };

  const linkClass =
    "inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-zinc-300 transition hover:border-accent/50 hover:text-accent";

  return (
    <div className="space-y-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar ao catálogo
      </Link>

      {/* ===== Hero ===== */}
      <section aria-labelledby="titulo-filme" className="relative overflow-hidden rounded-3xl border border-border/70">
        <div className="absolute inset-0 -z-10">
          {backdropUrl ? (
            <CatalogImage src={backdropUrl} alt="" fill sizes="100vw" className="object-cover object-top opacity-25" />
          ) : (
            <PlaceholderImage variant="backdrop" alt="" fill sizes="100vw" className="object-cover object-top opacity-25" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-8 p-6 sm:p-8 md:flex-row">
          <div className="relative mx-auto h-64 w-44 shrink-0 overflow-hidden rounded-2xl border border-border/50 shadow-2xl shadow-black/60 md:mx-0 md:h-96 md:w-64">
            {posterUrl ? (
              <CatalogImage src={posterUrl} alt={`Capa de ${movie.title}`} fill sizes="(max-width: 768px) 176px, 256px" className="object-cover" />
            ) : (
              <PlaceholderImage variant="poster" alt={`Sem capa para ${movie.title}`} fill sizes="(max-width: 768px) 176px, 256px" className="object-cover" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300">
                <PenLine className="h-3.5 w-3.5" aria-hidden="true" /> Cadastro manual · {movie.catalog.name}
              </p>
              <h1 id="titulo-filme" className="text-3xl font-bold tracking-tight sm:text-4xl">
                {movie.title}
                {year !== "—" && <span className="ml-2 text-zinc-500">({year})</span>}
              </h1>
              {movie.tagline && <p className="mt-1.5 text-sm italic text-zinc-400">“{movie.tagline}”</p>}
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="mt-1 text-xs text-zinc-500">Título original: {movie.originalTitle}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-300">
              {movie.voteAverage != null && movie.voteAverage > 0 && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                  <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                  {formatRating(movie.voteAverage)}
                  <span className="font-normal text-zinc-500">/10</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-zinc-400">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {formatRuntime(movie.runtime)}
              </span>
              {movie.releaseDate && <span className="text-zinc-400">Estreia: {formatDateBR(movie.releaseDate)}</span>}
              {movie.director && <span className="text-zinc-400">Direção: {movie.director}</span>}
            </div>

            {movie.genres.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Gêneros">
                {movie.genres.map((g) => (
                  <li key={g} className="rounded-full border border-border bg-surface/80 px-3 py-1 text-xs text-zinc-300">
                    {g}
                  </li>
                ))}
              </ul>
            )}

            {(movie.trailerUrl || movie.homepage || movie.imdbId) && (
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {movie.trailerUrl && (
                  <a href={movie.trailerUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Trailer <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
                {movie.imdbId && (
                  <a href={`https://www.imdb.com/title/${movie.imdbId}/`} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    IMDb <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
                {movie.homepage && (
                  <a href={movie.homepage} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Site oficial <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Ações do catálogo ===== */}
      <section aria-labelledby="titulo-acoes" className="space-y-4">
        <h2 id="titulo-acoes" className="sr-only">Ações do catálogo</h2>
        <MovieActions
          tmdbId={movie.tmdbId ?? 0}
          local={{
            id: movie.id,
            favorite: movie.favorite,
            watchlist: movie.watchlist,
            watched: movie.watched,
            personalRating: movie.personalRating,
            notes: movie.notes,
            watchedAt: movie.watchedAt ? movie.watchedAt.toISOString() : null,
            location: movie.location,
            shelf: movie.shelf,
            rack: movie.rack,
            numbering: movie.numbering,
            mediaType: movie.mediaType,
            mediaUrl: movie.mediaUrl,
          }}
        />
        <ManualMovieEditor movieId={movie.id} initial={initial} />
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {/* ===== Sinopse ===== */}
          <section aria-labelledby="titulo-sinopse">
            <h2 id="titulo-sinopse" className="mb-3 text-lg font-semibold">Sinopse</h2>
            <p className="max-w-prose whitespace-pre-line leading-relaxed text-zinc-300">
              {movie.overview || "Sinopse não informada."}
            </p>
          </section>

          {/* ===== Elenco ===== */}
          {movie.cast.length > 0 && (
            <section aria-labelledby="titulo-elenco">
              <h2 id="titulo-elenco" className="mb-3 text-lg font-semibold">Elenco</h2>
              <ul className="flex flex-wrap gap-2">
                {movie.cast.map((name) => (
                  <li key={name} className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-zinc-300">
                    {name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ===== Ficha técnica ===== */}
        <aside aria-labelledby="titulo-ficha" className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border/70 bg-surface/50 p-5">
            <h2 id="titulo-ficha" className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Ficha técnica</h2>
            <dl className="space-y-3 text-sm">
              {movie.director && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Direção</dt>
                  <dd className="text-right font-medium">{movie.director}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Lançamento</dt>
                <dd className="text-right font-medium">{formatDateBR(movie.releaseDate)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Duração</dt>
                <dd className="text-right font-medium">{formatRuntime(movie.runtime)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Gêneros</dt>
                <dd className="text-right font-medium">{movie.genres.join(", ") || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Países</dt>
                <dd className="text-right font-medium">{movie.countries.join(", ") || "—"}</dd>
              </div>
              {movie.productionCompanies.length > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Produtoras</dt>
                  <dd className="text-right font-medium">{movie.productionCompanies.join(", ")}</dd>
                </div>
              )}
              {movie.imdbId && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">IMDb ID</dt>
                  <dd className="text-right font-mono text-xs text-zinc-400">{movie.imdbId}</dd>
                </div>
              )}
              {movie.addedBy && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Adicionado por</dt>
                  <dd className="text-right font-medium">{movie.addedBy}</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
