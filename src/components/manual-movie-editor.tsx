"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ManualMovieForm, type ManualMovieFormValues } from "@/components/manual-movie-form";

interface Props {
  movieId: string;
  initial: ManualMovieFormValues;
}

/** Alterna entre visualizar e editar os metadados de um filme cadastrado manualmente. */
export function ManualMovieEditor({ movieId, initial }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="rounded-2xl border border-border/70 bg-surface/40 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Editar cadastro</h2>
        <ManualMovieForm mode="edit" movieId={movieId} initial={initial} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-zinc-300 transition hover:border-accent/50 hover:text-accent"
    >
      <Pencil className="h-4 w-4" aria-hidden="true" />
      Editar dados do filme
    </button>
  );
}
