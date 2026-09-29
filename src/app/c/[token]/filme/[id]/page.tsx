import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink, Eye, MapPin, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPublicCatalogByToken } from "@/lib/catalogs";
import { resolveImageUrl } from "@/lib/tmdb";
import { formatDateBR, formatRating, formatRuntime, releaseYear } from "@/lib/format";
import { mediaUsesUrl } from "@/lib/media";
import { CatalogImage } from "@/components/catalog-image";
import { PlaceholderImage } from "@/components/placeholder-image";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token, id } = await params;
  const catalog = await getPublicCatalogByToken(token).catch(() => null);
  if (!catalog) return { title: "Catálogo não encontrado", robots: { index: false, follow: false } };
  const movie = await prisma.movie.findFirst({ where: { id, catalogId: catalog.id }, select: { title: true } }).catch(() => null);
  return { title: movie?.title ?? "Filme", robots: { index: false, follow: false } };
}

/** Página de detalhes somente-leitura dentro de um catálogo público. */
export default async function PublicMoviePage({ params }: Props) {
  const { token, id } = await params;
  const catalog = await getPublicCatalogByToken(token).catch(() => null);
  if (!catalog) notFound();

  const movie = await prisma.movie
    .findFirst({ where: { id, catalogId: catalog.id } })
    .catch(() => null);
  if (!movie) notFound();

  const basePath = `/c/${token}`;
  const posterUrl = resolveImageUrl(movie.posterPath, "w500");
  const backdropUrl = resolveImageUrl(movie.backdropPath, "w1280");
  const year = releaseYear(movie.releaseDate);
  const watchUrl = mediaUsesUrl(movie.mediaType) ? movie.mediaUrl : null;

  const linkClass =
    "inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-zinc-300 transition hover:border-accent/50 hover:text-accent";

  return (
    <div className="space-y-10">
      <Link href={basePath} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-accent">
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
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Visualização pública · {catalog.name}
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

            {(watchUrl || movie.trailerUrl || movie.homepage || movie.imdbId || movie.tmdbId != null) && (
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {watchUrl && (
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent-soft px-3 py-1.5 font-semibold uppercase tracking-wide text-accent transition hover:bg-accent hover:text-black"
                  >
                    Assista online <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
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
                {movie.tmdbId != null && (
                  <a href={`https://www.themoviedb.org/movie/${movie.tmdbId}`} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    TMDB <ExternalLink className="h-3 w-3" aria-hidden="true" />
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

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <section aria-labelledby="titulo-sinopse">
            <h2 id="titulo-sinopse" className="mb-3 text-lg font-semibold">Sinopse</h2>
            <p className="max-w-prose whitespace-pre-line leading-relaxed text-zinc-300">
              {movie.overview || "Sinopse não informada."}
            </p>
          </section>

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
              {movie.addedBy && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Adicionado por</dt>
                  <dd className="text-right font-medium">{movie.addedBy}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Localização física / mídia da cópia (somente leitura) */}
          {(movie.location || movie.shelf || movie.rack || movie.numbering || movie.mediaType) && (
            <div className="rounded-2xl border border-border/70 bg-surface/50 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Localização física
              </h2>
              <dl className="space-y-3 text-sm">
                {movie.location && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Local</dt>
                    <dd className="text-right font-medium">{movie.location}</dd>
                  </div>
                )}
                {movie.shelf && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Estante</dt>
                    <dd className="text-right font-medium">{movie.shelf}</dd>
                  </div>
                )}
                {movie.rack && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Prateleira</dt>
                    <dd className="text-right font-medium">{movie.rack}</dd>
                  </div>
                )}
                {movie.numbering && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Numeração</dt>
                    <dd className="text-right font-medium">{movie.numbering}</dd>
                  </div>
                )}
                {movie.mediaType && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Tipo de mídia</dt>
                    <dd className="text-right font-medium">{movie.mediaType}</dd>
                  </div>
                )}
                {movie.mediaUrl && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">URL da cópia</dt>
                    <dd className="text-right">
                      <a href={movie.mediaUrl} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-accent hover:underline">
                        {movie.mediaUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
