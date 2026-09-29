"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, X } from "lucide-react";
import { CatalogImage } from "@/components/catalog-image";
import { PlaceholderImage } from "@/components/placeholder-image";
import { MEDIA_TYPES, mediaUsesUrl } from "@/lib/media";

export type ManualMovieFormValues = {
  title: string;
  originalTitle: string;
  tagline: string;
  overview: string;
  releaseDate: string;
  runtime: string;
  voteAverage: string;
  director: string;
  genres: string;
  countries: string;
  cast: string;
  productionCompanies: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  homepage: string;
  imdbId: string;
  location: string;
  shelf: string;
  rack: string;
  numbering: string;
  mediaType: string;
  mediaUrl: string;
};

const EMPTY: ManualMovieFormValues = {
  title: "",
  originalTitle: "",
  tagline: "",
  overview: "",
  releaseDate: "",
  runtime: "",
  voteAverage: "",
  director: "",
  genres: "",
  countries: "",
  cast: "",
  productionCompanies: "",
  posterUrl: "",
  backdropUrl: "",
  trailerUrl: "",
  homepage: "",
  imdbId: "",
  location: "",
  shelf: "",
  rack: "",
  numbering: "",
  mediaType: "",
  mediaUrl: "",
};

interface Props {
  mode: "create" | "edit";
  movieId?: string;
  initial?: Partial<ManualMovieFormValues>;
  onSaved?: () => void;
  onCancel?: () => void;
}

/** Formulário de cadastro/edição manual de um filme não encontrado nos catálogos oficiais. */
export function ManualMovieForm({ mode, movieId, initial, onSaved, onCancel }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ManualMovieFormValues>({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof ManualMovieFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function buildPayload() {
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      originalTitle: form.originalTitle,
      tagline: form.tagline,
      overview: form.overview,
      director: form.director,
      genres: form.genres,
      countries: form.countries,
      cast: form.cast,
      productionCompanies: form.productionCompanies,
      posterUrl: form.posterUrl,
      backdropUrl: form.backdropUrl,
      trailerUrl: form.trailerUrl,
      homepage: form.homepage,
      imdbId: form.imdbId,
      releaseDate: form.releaseDate,
      location: form.location,
      shelf: form.shelf,
      rack: form.rack,
      numbering: form.numbering,
      mediaType: form.mediaType,
      mediaUrl: mediaUsesUrl(form.mediaType) ? form.mediaUrl : "",
    };
    // numéricos: só envia quando preenchidos (evita gravar 0 indevido)
    if (form.runtime.trim()) payload.runtime = Number(form.runtime);
    if (form.voteAverage.trim()) payload.voteAverage = Number(form.voteAverage);
    return payload;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Informe ao menos o título do filme.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url = mode === "create" ? "/api/movies/manual" : `/api/movies/manual/${movieId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar o filme");
      if (mode === "create") {
        router.push(`/filme/${data.id}`);
      } else {
        router.refresh();
        onSaved?.();
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-zinc-500 focus:border-accent/60";
  const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500";
  const hintClass = "mt-1 text-[11px] text-zinc-600";

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* ===== Imagens ===== */}
      <section className="rounded-2xl border border-border/70 bg-surface/50 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Imagens</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="posterUrl" className={labelClass}>URL da capa (poster)</label>
            <input id="posterUrl" type="url" inputMode="url" value={form.posterUrl} onChange={set("posterUrl")} placeholder="https://…/capa.jpg" className={inputClass} />
            <p className={hintClass}>Cole o endereço de uma imagem (https).</p>
          </div>
          <div>
            <label htmlFor="backdropUrl" className={labelClass}>URL da imagem de fundo</label>
            <input id="backdropUrl" type="url" inputMode="url" value={form.backdropUrl} onChange={set("backdropUrl")} placeholder="https://…/fundo.jpg" className={inputClass} />
          </div>
        </div>
        {form.posterUrl ? (
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-surface-2">
              <CatalogImage src={form.posterUrl} alt="Pré-visualização da capa" fill sizes="112px" className="object-cover" />
            </div>
            <p className="text-xs text-zinc-500">Pré-visualização da capa informada.</p>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-surface-2">
              <PlaceholderImage variant="poster" alt="Capa padrão (placeholder)" fill sizes="112px" className="object-cover" />
            </div>
            <p className="text-xs text-zinc-500">Sem capa: a imagem padrão ao lado será exibida no catálogo e na página do filme.</p>
          </div>
        )}
      </section>

      {/* ===== Informações ===== */}
      <section className="rounded-2xl border border-border/70 bg-surface/50 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Informações</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className={labelClass}>Título *</label>
            <input id="title" required maxLength={200} value={form.title} onChange={set("title")} className={inputClass} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="originalTitle" className={labelClass}>Título original</label>
            <input id="originalTitle" maxLength={200} value={form.originalTitle} onChange={set("originalTitle")} className={inputClass} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="tagline" className={labelClass}>Slogan</label>
            <input id="tagline" maxLength={300} value={form.tagline} onChange={set("tagline")} className={inputClass} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="releaseDate" className={labelClass}>Data de lançamento</label>
            <input id="releaseDate" type="date" value={form.releaseDate} onChange={set("releaseDate")} className={inputClass} />
          </div>
          <div>
            <label htmlFor="runtime" className={labelClass}>Duração (min)</label>
            <input id="runtime" type="number" min={0} max={1000} value={form.runtime} onChange={set("runtime")} placeholder="ex.: 120" className={inputClass} />
          </div>
          <div>
            <label htmlFor="director" className={labelClass}>Direção</label>
            <input id="director" maxLength={160} value={form.director} onChange={set("director")} className={inputClass} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="voteAverage" className={labelClass}>Nota (0–10)</label>
            <input id="voteAverage" type="number" step="0.1" min={0} max={10} value={form.voteAverage} onChange={set("voteAverage")} placeholder="opcional" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="overview" className={labelClass}>Sinopse</label>
            <textarea id="overview" rows={4} maxLength={4000} value={form.overview} onChange={set("overview")} className={inputClass} />
          </div>
        </div>
      </section>

      {/* ===== Gêneros, países, elenco ===== */}
      <section className="rounded-2xl border border-border/70 bg-surface/50 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Classificação e elenco</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="genres" className={labelClass}>Gêneros</label>
            <input id="genres" value={form.genres} onChange={set("genres")} placeholder="Drama, Romance" className={inputClass} autoComplete="off" />
            <p className={hintClass}>Separe por vírgula.</p>
          </div>
          <div>
            <label htmlFor="countries" className={labelClass}>Países</label>
            <input id="countries" value={form.countries} onChange={set("countries")} placeholder="Brasil, França" className={inputClass} autoComplete="off" />
            <p className={hintClass}>Separe por vírgula.</p>
          </div>
          <div>
            <label htmlFor="cast" className={labelClass}>Elenco</label>
            <input id="cast" value={form.cast} onChange={set("cast")} placeholder="Nome 1, Nome 2" className={inputClass} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="productionCompanies" className={labelClass}>Produtoras</label>
            <input id="productionCompanies" value={form.productionCompanies} onChange={set("productionCompanies")} placeholder="Estúdio 1, Estúdio 2" className={inputClass} autoComplete="off" />
          </div>
        </div>
      </section>

      {/* ===== Links ===== */}
      <section className="rounded-2xl border border-border/70 bg-surface/50 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="trailerUrl" className={labelClass}>Trailer (URL)</label>
            <input id="trailerUrl" type="url" inputMode="url" value={form.trailerUrl} onChange={set("trailerUrl")} placeholder="https://youtube.com/…" className={inputClass} />
          </div>
          <div>
            <label htmlFor="homepage" className={labelClass}>Site oficial</label>
            <input id="homepage" type="url" inputMode="url" value={form.homepage} onChange={set("homepage")} placeholder="https://…" className={inputClass} />
          </div>
          <div>
            <label htmlFor="imdbId" className={labelClass}>ID do IMDb</label>
            <input id="imdbId" maxLength={20} value={form.imdbId} onChange={set("imdbId")} placeholder="tt1234567" className={inputClass} autoComplete="off" />
            <p className={hintClass}>Somente o código (tt…); o link é gerado automaticamente.</p>
          </div>
        </div>
      </section>

      {/* ===== Localização física ===== */}
      <section className="rounded-2xl border border-border/70 bg-surface/50 p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-400">Localização física</h2>
        <p className={hintClass}>Onde a cópia está guardada. Todos os campos são opcionais.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="location" className={labelClass}>Local</label>
            <input id="location" maxLength={120} value={form.location} onChange={set("location")} placeholder="ex.: Sala, Escritório" className={inputClass} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="shelf" className={labelClass}>Estante</label>
            <input id="shelf" maxLength={120} value={form.shelf} onChange={set("shelf")} placeholder="ex.: Estante A" className={inputClass} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="rack" className={labelClass}>Prateleira</label>
            <input id="rack" maxLength={120} value={form.rack} onChange={set("rack")} placeholder="ex.: Prateleira 2" className={inputClass} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="numbering" className={labelClass}>Numeração</label>
            <input id="numbering" maxLength={60} value={form.numbering} onChange={set("numbering")} placeholder="ex.: nº 042" className={inputClass} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="mediaType" className={labelClass}>Tipo de mídia</label>
            <select
              id="mediaType"
              value={form.mediaType}
              onChange={(e) => {
                const t = e.target.value;
                setForm((f) => ({ ...f, mediaType: t, mediaUrl: mediaUsesUrl(t) ? f.mediaUrl : "" }));
              }}
              className={inputClass}
            >
              <option value="">Não informado</option>
              {MEDIA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {mediaUsesUrl(form.mediaType) && (
            <div className="sm:col-span-2">
              <label htmlFor="mediaUrl" className={labelClass}>URL da cópia (Digital)</label>
              <input id="mediaUrl" type="url" inputMode="url" maxLength={600} value={form.mediaUrl} onChange={set("mediaUrl")} placeholder="https://…/arquivo.mp4" className={inputClass} />
            </div>
          )}
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {mode === "create" ? "Cadastrar filme" : "Salvar alterações"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm text-zinc-300 transition hover:border-red-500/50 hover:text-red-400 disabled:opacity-60"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
