"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bookmark, CheckCircle2, Film, Heart } from "lucide-react";

const TABS = [
  { key: "all", label: "Catálogo", icon: Film },
  { key: "favorites", label: "Favoritos", icon: Heart },
  { key: "watchlist", label: "Para assistir", icon: Bookmark },
  { key: "watched", label: "Assistidos", icon: CheckCircle2 },
] as const;

export function CatalogTabs({ counts }: { counts: Record<string, number> }) {
  const searchParams = useSearchParams();
  const current = searchParams.get("tab") ?? "all";

  return (
    <nav aria-label="Filtros do catálogo" className="flex flex-wrap gap-2">
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = current === key;
        // preserva todos os filtros ativos, trocando apenas a aba e resetando a página
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (key === "all") params.delete("tab");
        else params.set("tab", key);
        const href = params.size > 0 ? `/?${params.toString()}` : "/";
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-accent bg-accent text-black"
                : "border-border bg-surface text-zinc-300 hover:border-accent/50 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
            {counts[key] !== undefined && (
              <span className={`rounded-full px-1.5 text-xs ${active ? "bg-black/20" : "bg-surface-2 text-zinc-400"}`}>
                {counts[key]}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
