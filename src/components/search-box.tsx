"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Loader2, Search, Star } from "lucide-react";
import { releaseYear, formatRating } from "@/lib/format";

interface SearchItem {
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  releaseDate: string | null;
  voteAverage: number;
  inCatalog: boolean;
}

export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // limpeza sincronizada no handler (evita setState síncrono dentro do effect)
  function handleChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setOpen(true);
  }

  // busca com debounce
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Erro na busca");
          setItems([]);
        } else {
          setError(null);
          setItems(data.results.slice(0, 8));
          setOpen(true);
          setActive(-1);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("Falha na busca");
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // fecha ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // mantém o item ativo visível ao navegar com as setas (lista rolável)
  useEffect(() => {
    if (!open || active < 0 || !items[active]) return;
    document.getElementById(`search-opt-${items[active].tmdbId}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, items]);

  const go = useCallback(
    (tmdbId: number) => {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
      router.push(`/movie/${tmdbId}`);
    },
    [router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) {
      if (e.key === "Enter" && items.length > 0) go(items[0].tmdbId);
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        go(items[Math.max(active, 0)].tmdbId);
        break;
      case "Escape":
        setOpen(false);
        setActive(-1);
        break;
    }
  };

  const listId = "search-results-listbox";

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 && items[active] ? `search-opt-${items[active].tmdbId}` : undefined}
          aria-label="Buscar filmes no TMDB"
          placeholder="Buscar filmes… (ex: Interestelar, Matrix)"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-full border border-border bg-surface py-2 pl-10 pr-10 text-sm placeholder:text-zinc-500 focus:border-accent/60"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-accent" aria-label="Buscando" />
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 flex max-h-[min(70vh,calc(100dvh-7rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/50">
          {error && <p className="px-4 py-3 text-sm text-red-400" role="alert">{error}</p>}

          {!error && !loading && items.length === 0 && (
            <p className="px-4 py-3 text-sm text-zinc-500">Nenhum filme encontrado para “{query.trim()}”.</p>
          )}

          <ul id={listId} role="listbox" aria-label="Resultados da busca" className="min-h-0 flex-1 overflow-y-auto">
            {items.map((item, i) => (
              <li key={item.tmdbId} role="option" aria-selected={i === active} id={`search-opt-${item.tmdbId}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.tmdbId)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    i === active ? "bg-surface-2" : ""
                  }`}
                >
                  <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-surface-2">
                    {item.posterUrl ? (
                      <Image src={item.posterUrl} alt="" fill sizes="40px" className="object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-zinc-600">sem capa</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                      <span>{releaseYear(item.releaseDate)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-accent text-accent" aria-hidden="true" />
                        {formatRating(item.voteAverage)}
                      </span>
                      {item.inCatalog && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> no catálogo
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
