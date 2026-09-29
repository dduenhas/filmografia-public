"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus } from "lucide-react";

interface Props {
  tmdbId: number;
  inCatalog?: boolean;
  className?: string;
}

/** Botão de importação rápida de um filme do TMDB para o catálogo local */
export function AddToCatalogButton({ tmdbId, inCatalog = false, className = "" }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(inCatalog ? "done" : "idle");

  async function add(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (state === "loading" || state === "done") return;
    setState("loading");
    try {
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao adicionar");
      }
      setState("done");
      router.refresh();
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  if (state === "done") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent ${className}`}
        title="Este filme já está no seu catálogo"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> No catálogo
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={state === "loading"}
      aria-label={state === "error" ? "Erro ao adicionar ao catálogo" : "Adicionar ao catálogo"}
      title={state === "error" ? "Erro ao adicionar — tente pela página do filme" : "Adicionar ao catálogo"}
      className={`inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent hover:text-black disabled:opacity-60 ${className}`}
    >
      {state === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : state === "error" ? (
        "Erro"
      ) : (
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {state === "idle" && "Catalogar"}
    </button>
  );
}
