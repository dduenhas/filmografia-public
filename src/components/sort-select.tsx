"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

const OPTIONS = [
  { value: "recent", label: "Adicionados recentemente" },
  { value: "title", label: "Título (A–Z)" },
  { value: "rating", label: "Melhor nota (TMDB)" },
  { value: "personal", label: "Minha nota" },
  { value: "release_desc", label: "Lançamento (novos)" },
  { value: "release_asc", label: "Lançamento (antigos)" },
  { value: "runtime", label: "Duração (maior)" },
] as const;

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "recent";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-zinc-400">
      <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Ordenar por</span>
      <select
        value={current}
        onChange={onChange}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent/60"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
