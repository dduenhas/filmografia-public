"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, X } from "lucide-react";
import type { Facets } from "@/lib/catalog";
import { MEDIA_TYPES } from "@/lib/media";
import { MultiSelect } from "@/components/multi-select";

interface Props {
  facets: Facets;
}

const FILTER_KEYS = ["genres", "countries", "yearFrom", "yearTo", "cast", "director", "company", "mediaType", "location", "shelf"] as const;

function splitCsv(v: string | null): string[] {
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

/** Painel de filtros avançados do catálogo. Gênero/país em chips; ano, ator, diretor e produtora por campo. */
export function FiltersPanel({ facets }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = useMemo(
    () => ({
      genres: splitCsv(searchParams.get("genres")),
      countries: splitCsv(searchParams.get("countries")),
      yearFrom: searchParams.get("yearFrom") ?? "",
      yearTo: searchParams.get("yearTo") ?? "",
      cast: searchParams.get("cast") ?? "",
      director: searchParams.get("director") ?? "",
      company: searchParams.get("company") ?? "",
      mediaType: searchParams.get("mediaType") ?? "",
      location: searchParams.get("location") ?? "",
      shelf: searchParams.get("shelf") ?? "",
    }),
    [searchParams],
  );

  const [open, setOpen] = useState(false);
  const [genres, setGenres] = useState<string[]>(initial.genres);
  const [countries, setCountries] = useState<string[]>(initial.countries);
  const [yearFrom, setYearFrom] = useState(initial.yearFrom);
  const [yearTo, setYearTo] = useState(initial.yearTo);
  const [cast, setCast] = useState(initial.cast);
  const [director, setDirector] = useState(initial.director);
  const [company, setCompany] = useState(initial.company);
  const [mediaType, setMediaType] = useState(initial.mediaType);
  const [location, setLocation] = useState(initial.location);
  const [shelf, setShelf] = useState(initial.shelf);

  const activeCount =
    genres.length +
    countries.length +
    (yearFrom ? 1 : 0) +
    (yearTo ? 1 : 0) +
    (cast ? 1 : 0) +
    (director ? 1 : 0) +
    (company ? 1 : 0) +
    (mediaType ? 1 : 0) +
    (location ? 1 : 0) +
    (shelf ? 1 : 0);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function apply(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    FILTER_KEYS.forEach((k) => params.delete(k));
    if (genres.length) params.set("genres", genres.join(","));
    if (countries.length) params.set("countries", countries.join(","));
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo) params.set("yearTo", yearTo);
    if (cast.trim()) params.set("cast", cast.trim());
    if (director.trim()) params.set("director", director.trim());
    if (company.trim()) params.set("company", company.trim());
    if (mediaType) params.set("mediaType", mediaType);
    if (location.trim()) params.set("location", location.trim());
    if (shelf.trim()) params.set("shelf", shelf.trim());
    router.push(params.size > 0 ? `/?${params.toString()}` : "/");
  }

  function clear() {
    setGenres([]);
    setCountries([]);
    setYearFrom("");
    setYearTo("");
    setCast("");
    setDirector("");
    setCompany("");
    setMediaType("");
    setLocation("");
    setShelf("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    FILTER_KEYS.forEach((k) => params.delete(k));
    router.push(params.size > 0 ? `/?${params.toString()}` : "/");
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition ${
      active
        ? "border-accent bg-accent text-black"
        : "border-border bg-surface text-zinc-300 hover:border-accent/50"
    }`;

  const fieldClass =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-zinc-500 focus:border-accent/60";

  return (
    <div className="rounded-2xl border border-border/70 bg-surface/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="painel-filtros"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium"
      >
        <span className="inline-flex items-center gap-2">
          <Filter className="h-4 w-4 text-accent" aria-hidden="true" />
          Filtros avançados
          {activeCount > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-black">{activeCount}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <form id="painel-filtros" onSubmit={apply} className="space-y-5 border-t border-border/60 px-4 py-4">
          {facets.genres.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Gênero</legend>
              <div className="flex flex-wrap gap-2">
                {facets.genres.map((g) => (
                  <button key={g} type="button" onClick={() => toggle(genres, setGenres, g)} className={chip(genres.includes(g))} aria-pressed={genres.includes(g)}>
                    {g}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {facets.countries.length > 0 && (
            <MultiSelect id="countries" label="País" options={facets.countries} selected={countries} onChange={setCountries} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="yearFrom" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Ano (de)
              </label>
              <input id="yearFrom" type="number" inputMode="numeric" min={1870} max={2100} value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="ex.: 1990" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="yearTo" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Ano (até)
              </label>
              <input id="yearTo" type="number" inputMode="numeric" min={1870} max={2100} value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="ex.: 2010" className={fieldClass} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="cast" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Ator / Atriz
              </label>
              <input id="cast" list="cast-options" value={cast} onChange={(e) => setCast(e.target.value)} placeholder="Nome do elenco" className={fieldClass} />
              <datalist id="cast-options">
                {facets.cast.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="director" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Diretor(a)
              </label>
              <input id="director" list="director-options" value={director} onChange={(e) => setDirector(e.target.value)} placeholder="Nome da direção" className={fieldClass} />
              <datalist id="director-options">
                {facets.directors.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="company" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Produtora
              </label>
              <input id="company" list="company-options" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Estúdio / produtora" className={fieldClass} />
              <datalist id="company-options">
                {facets.companies.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="mediaType" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Tipo de mídia
              </label>
              <select id="mediaType" value={mediaType} onChange={(e) => setMediaType(e.target.value)} className={fieldClass}>
                <option value="">Todas</option>
                {MEDIA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="location" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Local
              </label>
              <input id="location" list="location-options" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ex.: Sala" className={fieldClass} />
              <datalist id="location-options">
                {facets.locations.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="shelf" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Estante
              </label>
              <input id="shelf" list="shelf-options" value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="ex.: Estante A" className={fieldClass} />
              <datalist id="shelf-options">
                {facets.shelves.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110">
              Aplicar filtros
            </button>
            {activeCount > 0 && (
              <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-zinc-300 transition hover:border-red-500/50 hover:text-red-400">
                <X className="h-4 w-4" aria-hidden="true" />
                Limpar
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
