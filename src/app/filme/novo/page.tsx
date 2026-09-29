import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, PenLine } from "lucide-react";
import { getActiveUser, getSession } from "@/lib/auth";
import { canWriteCatalog, resolveCurrentCatalog } from "@/lib/catalogs";
import { ManualMovieForm } from "@/components/manual-movie-form";

export const metadata: Metadata = {
  title: "Cadastrar filme manualmente",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewManualMoviePage() {
  const user = await getActiveUser(await getSession());
  if (!user) redirect("/login");

  const catalog = await resolveCurrentCatalog(user);
  if (!canWriteCatalog(user, catalog)) redirect("/");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar ao catálogo
      </Link>

      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <PenLine className="h-6 w-6 text-accent" aria-hidden="true" />
          Cadastrar filme manualmente
        </h1>
        <p className="text-sm text-zinc-400">
          Para filmes que não estão nos catálogos oficiais (TMDB). Você pode informar capa, imagens e links livremente.
          Será adicionado em <strong className="text-foreground">{catalog.name}</strong>.
        </p>
      </header>

      <ManualMovieForm mode="create" />
    </div>
  );
}
