import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Clock, ExternalLink, MonitorPlay, Star, User } from "lucide-react";
import { getFullMovieDetails, tmdbImageUrl } from "@/lib/tmdb";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getSession } from "@/lib/auth";
import { resolveCurrentCatalog } from "@/lib/catalogs";
import { formatDateBR, formatRating, formatRuntime, releaseYear } from "@/lib/format";
import { MovieActions } from "@/components/movie-actions";
import { PlaceholderImage } from "@/components/placeholder-image";
import { TrailerModal } from "@/components/trailer-modal";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ tmdbId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tmdbId } = await params;
  const id = Number(tmdbId);
  if (!Number.isInteger(id) || id <= 0) return { title: "Filme não encontrado" };
  try {
    const m = await getFullMovieDetails(id);
    const year = m.releaseDate ? m.releaseDate.slice(0, 4) : "";
    return {
      title: `${m.title}${year ? ` (${year})` : ""}`,
      description: m.overview.slice(0, 180) || `Detalhes, trailer e onde assistir ${m.title}`,
      openGraph: {
        title: m.title,
        description: m.overview.slice(0, 180),
        images: m.backdropPath ? [{ url: tmdbImageUrl(m.backdropPath, "w780") ?? "" }] : undefined,
      },
    };
  } catch {
    return { title: "Filme" };
  }
}

export default async function MoviePage({ params }: Props) {
  const { tmdbId } = await params;
  const id = Number(tmdbId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let movie;
  try {
    movie = await getFullMovieDetails(id);
  } catch (err) {
    console.error("Erro ao carregar filme:", err);
    notFound();
  }

  // registro local (catálogo ativo) — página continua útil mesmo com banco indisponível
  let local = null;
  try {
    const user = await getActiveUser(await getSession());
    if (user) {
      const catalog = await resolveCurrentCatalog(user);
      local = await prisma.movie.findFirst({
        where: { catalogId: catalog.id, tmdbId: id },
        select: {
          id: true,
          favorite: true,
          watchlist: true,
          watched: true,
          personalRating: true,
          notes: true,
          watchedAt: true,
          location: true,
          shelf: true,
          rack: true,
          numbering: true,
          mediaType: true,
          mediaUrl: true,
        },
      });
    }
  } catch (err) {
    console.error("Erro ao ler registro local:", err);
  }

  const posterUrl = tmdbImageUrl(movie.posterPath, "w500");
  const backdropUrl = tmdbImageUrl(movie.backdropPath, "w1280");
  const year = releaseYear(movie.releaseDate);
  const wp = movie.watchProviders;
  const hasProviders = wp.flatrate.length > 0 || wp.rent.length > 0 || wp.buy.length > 0;

  const providerSection = (label: string, list: { name: string; logoPath: string | null }[]) =>
    list.length > 0 && (
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</h3>
        <ul className="flex flex-wrap gap-3">
          {list.map((p) => (
            <li key={p.name} className="flex items-center gap-2" title={p.name}>
              <span className="relative h-10 w-10 overflow-hidden rounded-lg bg-surface-2">
                {p.logoPath ? (
                  <Image src={tmdbImageUrl(p.logoPath, "original") ?? ""} alt="" fill sizes="40px" className="object-cover" />
                ) : (
                  <MonitorPlay className="m-2 h-6 w-6 text-zinc-600" aria-hidden="true" />
                )}
              </span>
              <span className="text-sm text-zinc-300">{p.name}</span>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="space-y-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar ao catálogo
      </Link>

      {/* ===== Hero ===== */}
      <section aria-labelledby="titulo-filme" className="relative overflow-hidden rounded-3xl border border-border/70">
        <div className="absolute inset-0 -z-10">
          {backdropUrl ? (
            <Image src={backdropUrl} alt="" fill priority sizes="100vw" className="object-cover object-top opacity-25" />
          ) : (
            <PlaceholderImage variant="backdrop" alt="" fill priority sizes="100vw" className="object-cover object-top opacity-25" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-8 p-6 sm:p-8 md:flex-row">
          <div className="relative mx-auto h-64 w-44 shrink-0 overflow-hidden rounded-2xl border border-border/50 shadow-2xl shadow-black/60 md:mx-0 md:h-96 md:w-64">
            {posterUrl ? (
              <Image src={posterUrl} alt={`Capa de ${movie.title}`} fill priority sizes="(max-width: 768px) 176px, 256px" className="object-cover" />
            ) : (
              <PlaceholderImage variant="poster" alt={`Sem capa para ${movie.title}`} fill priority sizes="(max-width: 768px) 176px, 256px" className="object-cover" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
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
              <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                {formatRating(movie.voteAverage)}
                <span className="font-normal text-zinc-500">/10 · {movie.voteCount.toLocaleString("pt-BR")} votos no TMDB</span>
              </span>
              {movie.imdbRating && (
                <span className="rounded-md bg-[#f5c518]/15 px-2 py-0.5 font-bold text-[#f5c518]" title="Nota no IMDb">
                  IMDb {movie.imdbRating.replace(".", ",")}
                </span>
              )}
              {movie.rated && (
                <span className="rounded-md border border-border px-2 py-0.5 text-xs text-zinc-400" title="Classificação indicativa">
                  {movie.rated}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-zinc-400">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {formatRuntime(movie.runtime)}
              </span>
              {movie.releaseDate && (
                <span className="text-zinc-400">Estreia: {formatDateBR(movie.releaseDate)}</span>
              )}
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

            {movie.awards && (
              <p className="inline-flex items-start gap-2 text-sm text-amber-300/90">
                <Award className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {movie.awards}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <TrailerModal videos={movie.videos} title={movie.title} />
              <div className="flex flex-wrap gap-2 text-xs">
                {movie.imdbId && (
                  <a
                    href={`https://www.imdb.com/title/${movie.imdbId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                  >
                    IMDb <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
                <a
                  href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                >
                  TMDB <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                {wp.link && (
                  <a
                    href={wp.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                  >
                    JustWatch <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
                {movie.homepage && (
                  <a
                    href={movie.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                  >
                    Site oficial <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Ações do catálogo ===== */}
      <section aria-labelledby="titulo-acoes">
        <h2 id="titulo-acoes" className="sr-only">
          Ações do catálogo
        </h2>
        <MovieActions key={local?.id ?? "sem-registro"} tmdbId={movie.tmdbId} local={local ? { ...local, watchedAt: local.watchedAt ? local.watchedAt.toISOString() : null } : null} />
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {/* ===== Sinopse ===== */}
          <section aria-labelledby="titulo-sinopse">
            <h2 id="titulo-sinopse" className="mb-3 text-lg font-semibold">
              Sinopse
            </h2>
            <p className="max-w-prose whitespace-pre-line leading-relaxed text-zinc-300">
              {movie.overview || "Sinopse não disponível em português."}
            </p>
          </section>

          {/* ===== Onde assistir ===== */}
          <section aria-labelledby="titulo-onde">
            <h2 id="titulo-onde" className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <MonitorPlay className="h-5 w-5 text-accent" aria-hidden="true" />
              Onde assistir
              <span className="text-xs font-normal text-zinc-500">(Brasil · via JustWatch)</span>
            </h2>
            {hasProviders ? (
              <div className="space-y-5 rounded-2xl border border-border/70 bg-surface/50 p-5">
                {providerSection("Streaming", wp.flatrate)}
                {providerSection("Alugar", wp.rent)}
                {providerSection("Comprar", wp.buy)}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Nenhuma plataforma disponível para o Brasil no momento.{" "}
                {wp.link && (
                  <a href={wp.link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    Verificar no JustWatch
                  </a>
                )}
              </p>
            )}
          </section>

          {/* ===== Elenco ===== */}
          {movie.cast.length > 0 && (
            <section aria-labelledby="titulo-elenco">
              <h2 id="titulo-elenco" className="mb-4 text-lg font-semibold">
                Elenco principal
              </h2>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {movie.cast.map((person) => (
                  <li key={person.name} className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
                    <div className="relative aspect-square w-full bg-surface-2">
                      {person.profilePath ? (
                        <Image
                          src={tmdbImageUrl(person.profilePath, "w185") ?? ""}
                          alt={person.name}
                          fill
                          sizes="140px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center">
                          <User className="h-10 w-10 text-zinc-700" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-xs font-semibold">{person.name}</p>
                      <p className="truncate text-[11px] text-zinc-500" title={person.character}>
                        {person.character}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ===== Ficha técnica ===== */}
        <aside aria-labelledby="titulo-ficha" className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border/70 bg-surface/50 p-5">
            <h2 id="titulo-ficha" className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Ficha técnica
            </h2>
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
              {movie.imdbId && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">IMDb ID</dt>
                  <dd className="text-right font-mono text-xs text-zinc-400">{movie.imdbId}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">TMDB ID</dt>
                <dd className="text-right font-mono text-xs text-zinc-400">{movie.tmdbId}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
