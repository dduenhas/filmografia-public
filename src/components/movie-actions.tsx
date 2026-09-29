"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, CheckCircle2, Heart, Loader2, MapPin, Plus, Save, Trash2 } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { formatDateBR } from "@/lib/format";
import { MEDIA_TYPES, mediaUsesUrl } from "@/lib/media";

export interface LocalMovieState {
  id: string;
  favorite: boolean;
  watchlist: boolean;
  watched: boolean;
  personalRating: number | null;
  notes: string | null;
  watchedAt: string | null;
  location: string | null;
  shelf: string | null;
  rack: string | null;
  numbering: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
}

interface Props {
  tmdbId: number;
  local: LocalMovieState | null;
}

export function MovieActions({ tmdbId, local: initial }: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<LocalMovieState | null>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState(initial?.notes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [locDraft, setLocDraft] = useState({
    location: initial?.location ?? "",
    shelf: initial?.shelf ?? "",
    rack: initial?.rack ?? "",
    numbering: initial?.numbering ?? "",
    mediaType: initial?.mediaType ?? "",
    mediaUrl: initial?.mediaUrl ?? "",
  });

  async function importMovie() {
    setBusy("import");
    setError(null);
    try {
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha ao importar");
      router.refresh();
      // estado local será atualizado pelo refresh; enquanto isso, sinaliza sucesso
      setBusy(null);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function patch(data: Partial<Omit<LocalMovieState, "id">>, key: string) {
    if (!local) return;
    setBusy(key);
    setError(null);
    const previous = local;
    setLocal({ ...local, ...data }); // otimista
    try {
      const res = await fetch(`/api/movies/${local.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha ao salvar");
      const updated = await res.json();
      setLocal({
        id: local.id,
        favorite: updated.favorite,
        watchlist: updated.watchlist,
        watched: updated.watched,
        personalRating: updated.personalRating,
        notes: updated.notes,
        watchedAt: updated.watchedAt,
        location: updated.location,
        shelf: updated.shelf,
        rack: updated.rack,
        numbering: updated.numbering,
        mediaType: updated.mediaType,
        mediaUrl: updated.mediaUrl,
      });
      router.refresh();
    } catch (e) {
      setLocal(previous); // reverte otimista
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!local) return;
    if (!window.confirm("Remover este filme do seu catálogo? Suas anotações serão perdidas.")) return;
    setBusy("remove");
    setError(null);
    try {
      const res = await fetch(`/api/movies/${local.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao remover");
      setLocal(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const toggleClass = (active: boolean, activeColor: string) =>
    `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
      active ? `border-transparent ${activeColor}` : "border-border bg-surface text-zinc-300 hover:border-accent/40"
    }`;

  if (!local) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={importMovie}
          disabled={busy === "import"}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
        >
          {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          Adicionar ao meu catálogo
        </button>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  const locDirty =
    locDraft.location !== (local.location ?? "") ||
    locDraft.shelf !== (local.shelf ?? "") ||
    locDraft.rack !== (local.rack ?? "") ||
    locDraft.numbering !== (local.numbering ?? "") ||
    locDraft.mediaType !== (local.mediaType ?? "") ||
    locDraft.mediaUrl !== (local.mediaUrl ?? "");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Ações do catálogo">
        <button
          type="button"
          onClick={() => patch({ favorite: !local.favorite }, "favorite")}
          disabled={busy !== null}
          aria-pressed={local.favorite}
          className={toggleClass(local.favorite, "bg-red-500/20 text-red-400")}
        >
          {busy === "favorite" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Heart className={`h-4 w-4 ${local.favorite ? "fill-current" : ""}`} aria-hidden="true" />}
          Favorito
        </button>
        <button
          type="button"
          onClick={() => patch({ watchlist: !local.watchlist }, "watchlist")}
          disabled={busy !== null}
          aria-pressed={local.watchlist}
          className={toggleClass(local.watchlist, "bg-sky-500/20 text-sky-400")}
        >
          {busy === "watchlist" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Bookmark className={`h-4 w-4 ${local.watchlist ? "fill-current" : ""}`} aria-hidden="true" />}
          Para assistir
        </button>
        <button
          type="button"
          onClick={() => patch({ watched: !local.watched }, "watched")}
          disabled={busy !== null}
          aria-pressed={local.watched}
          className={toggleClass(local.watched, "bg-emerald-500/20 text-emerald-400")}
        >
          {busy === "watched" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          Já assisti
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy !== null}
          aria-label="Remover do catálogo"
          title="Remover do catálogo"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-zinc-400 transition hover:border-red-500/50 hover:text-red-400 disabled:opacity-60"
        >
          {busy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
          <span className="sr-only sm:not-sr-only">Remover</span>
        </button>
      </div>

      <div className="rounded-2xl border border-border/70 bg-surface/60 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Sua avaliação</p>
        <StarRating
          value={local.personalRating}
          disabled={busy !== null}
          onChange={(v) => patch({ personalRating: v }, "rating")}
        />
        {local.watched && local.watchedAt && (
          <p className="mt-2 text-xs text-zinc-500">Assistido em {formatDateBR(local.watchedAt)}</p>
        )}

        <div className="mt-4">
          <label htmlFor="notes" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Anotações
          </label>
          <textarea
            id="notes"
            rows={3}
            maxLength={2000}
            value={notesDraft}
            placeholder="O que você achou do filme? Para quem recomendaria?"
            onChange={(e) => {
              setNotesDraft(e.target.value);
              setNotesDirty(e.target.value !== (local.notes ?? ""));
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-accent/60"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={!notesDirty || busy !== null}
              onClick={() => {
                patch({ notes: notesDraft.trim() || null }, "notes").then(() => setNotesDirty(false));
              }}
              className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent transition hover:bg-accent hover:text-black disabled:opacity-40 disabled:hover:bg-accent-soft disabled:hover:text-accent"
            >
              {busy === "notes" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
              Salvar anotações
            </button>
            {notesDirty && <span className="text-xs text-zinc-500">alterações não salvas</span>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-surface/60 p-4">
        <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Localização física
          <span className="font-normal normal-case tracking-normal text-zinc-600">(opcional)</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-500">Local</span>
            <input
              value={locDraft.location}
              onChange={(e) => setLocDraft((d) => ({ ...d, location: e.target.value }))}
              placeholder="ex.: Sala, Escritório"
              maxLength={120}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-500">Estante</span>
            <input
              value={locDraft.shelf}
              onChange={(e) => setLocDraft((d) => ({ ...d, shelf: e.target.value }))}
              placeholder="ex.: Estante A"
              maxLength={120}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-500">Prateleira</span>
            <input
              value={locDraft.rack}
              onChange={(e) => setLocDraft((d) => ({ ...d, rack: e.target.value }))}
              placeholder="ex.: Prateleira 2"
              maxLength={120}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-500">Numeração</span>
            <input
              value={locDraft.numbering}
              onChange={(e) => setLocDraft((d) => ({ ...d, numbering: e.target.value }))}
              placeholder="ex.: nº 042"
              maxLength={60}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-accent/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-500">Tipo de mídia</span>
            <select
              value={locDraft.mediaType}
              onChange={(e) => {
                const t = e.target.value;
                setLocDraft((d) => ({ ...d, mediaType: t, mediaUrl: mediaUsesUrl(t) ? d.mediaUrl : "" }));
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent/60"
            >
              <option value="">Não informado</option>
              {MEDIA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          {mediaUsesUrl(locDraft.mediaType) && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] text-zinc-500">URL da cópia (Digital)</span>
              <input
                type="url"
                inputMode="url"
                value={locDraft.mediaUrl}
                onChange={(e) => setLocDraft((d) => ({ ...d, mediaUrl: e.target.value }))}
                placeholder="https://…/arquivo.mp4"
                maxLength={600}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-accent/60"
              />
            </label>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={!locDirty || busy !== null}
            onClick={() =>
              patch(
                {
                  location: locDraft.location.trim() || null,
                  shelf: locDraft.shelf.trim() || null,
                  rack: locDraft.rack.trim() || null,
                  numbering: locDraft.numbering.trim() || null,
                  mediaType: locDraft.mediaType || null,
                  mediaUrl: mediaUsesUrl(locDraft.mediaType) ? locDraft.mediaUrl.trim() || null : null,
                },
                "location",
              )
            }
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent transition hover:bg-accent hover:text-black disabled:opacity-40 disabled:hover:bg-accent-soft disabled:hover:text-accent"
          >
            {busy === "location" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
            Salvar localização
          </button>
          {locDirty && <span className="text-xs text-zinc-500">alterações não salvas</span>}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
