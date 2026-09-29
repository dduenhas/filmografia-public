import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, CheckCircle2, Film, Heart, Star, Users } from "lucide-react";
import { getActiveUser, getSession } from "@/lib/auth";
import { getDashboardStats } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { resolveImageUrl } from "@/lib/tmdb";
import { resolveCurrentCatalog } from "@/lib/catalogs";
import { movieHref } from "@/lib/movie-link";
import { formatRating, releaseYear } from "@/lib/format";
import { CatalogImage } from "@/components/catalog-image";
import { PlaceholderImage } from "@/components/placeholder-image";
import { CollaboratorsManager, type Collaborator } from "@/components/collaborators-manager";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getActiveUser(await getSession());
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  const catalog = await resolveCurrentCatalog(user);

  const [stats, users] = await Promise.all([
    getDashboardStats(catalog.id),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const collaborators: Collaborator[] = users.map((u) => ({
    ...u,
    role: u.role as Collaborator["role"],
    createdAt: u.createdAt.toISOString(),
  }));

  const statCards = [
    { label: "Filmes no catálogo", value: stats.total, icon: Film },
    { label: "Favoritos", value: stats.favorites, icon: Heart },
    { label: "Para assistir", value: stats.watchlist, icon: Bookmark },
    { label: "Assistidos", value: stats.watched, icon: CheckCircle2 },
  ];

  const maxGenre = Math.max(1, ...stats.genres.map((g) => g.count));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Visão geral de <strong className="text-foreground">{catalog.name}</strong> e gestão de colaboradores. Olá, <strong className="text-foreground">{user.name}</strong>.
        </p>
      </header>

      {/* ===== Estatísticas ===== */}
      <section aria-labelledby="stats" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <h2 id="stats" className="sr-only">Estatísticas do catálogo</h2>
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border/70 bg-surface/50 p-5">
            <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
            <p className="mt-3 text-3xl font-bold">{value}</p>
            <p className="text-xs text-zinc-400">{label}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ===== Notas médias ===== */}
        <section className="rounded-2xl border border-border/70 bg-surface/50 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            <Star className="h-4 w-4 text-accent" aria-hidden="true" />
            Avaliações médias
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-accent">{stats.avgPersonal !== null ? stats.avgPersonal.toFixed(1).replace(".", ",") : "—"}</p>
              <p className="text-xs text-zinc-500">Sua nota média (0–10)</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avgTmdb !== null ? stats.avgTmdb.toFixed(1).replace(".", ",") : "—"}</p>
              <p className="text-xs text-zinc-500">Nota média no TMDB</p>
            </div>
          </div>
        </section>

        {/* ===== Gêneros mais presentes ===== */}
        <section className="rounded-2xl border border-border/70 bg-surface/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Gêneros mais catalogados</h2>
          {stats.genres.length === 0 ? (
            <p className="text-sm text-zinc-500">Sem dados ainda.</p>
          ) : (
            <ul className="space-y-2">
              {stats.genres.map((g) => (
                <li key={g.genre} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 truncate text-zinc-300">{g.genre}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(g.count / maxGenre) * 100}%` }} />
                  </span>
                  <span className="w-6 shrink-0 text-right text-xs text-zinc-500">{g.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ===== Adicionados recentemente ===== */}
      <section aria-labelledby="recentes">
        <h2 id="recentes" className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Adicionados recentemente
        </h2>
        {stats.recentAdded.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum filme catalogado ainda.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {stats.recentAdded.map((m) => {
              const poster = resolveImageUrl(m.posterPath, "w185");
              return (
                <li key={m.id}>
                  <Link href={movieHref({ id: m.id, tmdbId: m.tmdbId, source: m.source })} className="group block overflow-hidden rounded-xl border border-border/70 bg-surface transition hover:border-accent/50">
                    <div className="relative aspect-[2/3] w-full bg-surface-2">
                      {poster ? (
                        <CatalogImage src={poster} alt={`Capa de ${m.title}`} fill sizes="160px" className="object-cover" />
                      ) : (
                        <PlaceholderImage variant="poster" alt="" fill sizes="160px" className="object-cover" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-medium">{m.title}</p>
                      <p className="text-[11px] text-zinc-500">
                        {releaseYear(m.releaseDate)} · ★ {formatRating(m.voteAverage)}
                      </p>
                      {m.addedBy && <p className="mt-0.5 truncate text-[10px] text-zinc-600">por {m.addedBy}</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ===== Colaboradores ===== */}
      <section aria-labelledby="colaboradores">
        <h2 id="colaboradores" className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          <Users className="h-4 w-4 text-accent" aria-hidden="true" />
          Colaboradores ({collaborators.length})
        </h2>
        <CollaboratorsManager users={collaborators} currentUserId={user.id} />
      </section>
    </div>
  );
}
