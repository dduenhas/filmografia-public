"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, FolderPlus, Library, Loader2, Pencil, Trash2, Users } from "lucide-react";

export interface CatalogOption {
  id: string;
  name: string;
  isShared: boolean;
  ownerId: string | null;
  movieCount: number;
}

interface Props {
  catalogs: CatalogOption[];
  activeId: string;
  currentUserId: string;
}

/** Seletor de catálogo ativo + criação/gerenciamento dos catálogos pessoais do usuário. */
export function CatalogSwitcher({ catalogs, activeId, currentUserId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = catalogs.find((c) => c.id === activeId) ?? catalogs[0];

  async function go() {
    router.push("/");
    router.refresh();
  }

  async function select(id: string) {
    if (id === activeId) {
      setOpen(false);
      return;
    }
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/catalogs/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha ao trocar de catálogo");
      setOpen(false);
      await go();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy("create");
    setError(null);
    try {
      const res = await fetch("/api/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha ao criar catálogo");
      setName("");
      setCreating(false);
      setOpen(false);
      await go();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function rename(cat: CatalogOption) {
    const next = prompt(`Novo nome para "${cat.name}":`, cat.name);
    if (!next || next.trim() === cat.name) return;
    setBusy(cat.id);
    setError(null);
    try {
      const res = await fetch(`/api/catalogs/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha ao renomear");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(cat: CatalogOption) {
    if (!confirm(`Excluir o catálogo "${cat.name}" e todos os filmes dele? Essa ação não pode ser desfeita.`)) return;
    setBusy(cat.id);
    setError(null);
    try {
      const res = await fetch(`/api/catalogs/${cat.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Falha ao excluir");
      setOpen(false);
      await go();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:border-accent/50"
      >
        <Library className="h-4 w-4 text-accent" aria-hidden="true" />
        <span className="max-w-40 truncate">{active?.name ?? "Catálogo"}</span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/40">
            <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
              {catalogs.map((cat) => {
                const isActive = cat.id === activeId;
                // pessoais: o time co-gerencia (renomeia); excluir fica restrito ao dono.
                const manageable = !cat.isShared;
                const canDelete = manageable && cat.ownerId === currentUserId;
                return (
                  <li key={cat.id} role="option" aria-selected={isActive} className="group flex items-center gap-1 px-2 py-1">
                    <button
                      type="button"
                      onClick={() => select(cat.id)}
                      disabled={busy !== null}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-surface-2 disabled:opacity-60"
                    >
                      {cat.isShared ? (
                        <Users className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      ) : (
                        <Library className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{cat.name}</span>
                        <span className="block text-[11px] text-zinc-500">
                          {cat.movieCount} {cat.movieCount === 1 ? "filme" : "filmes"}
                          {cat.isShared && " · compartilhado"}
                        </span>
                      </span>
                      {isActive && <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />}
                      {busy === cat.id && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden="true" />}
                    </button>
                    {manageable && (
                      <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        <button type="button" onClick={() => rename(cat)} disabled={busy !== null} aria-label={`Renomear ${cat.name}`} className="rounded p-1.5 text-zinc-400 hover:text-accent disabled:opacity-40">
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        {canDelete && (
                          <button type="button" onClick={() => remove(cat)} disabled={busy !== null} aria-label={`Excluir ${cat.name}`} className="rounded p-1.5 text-zinc-400 hover:text-red-400 disabled:opacity-40">
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-border/60 p-2">
              {creating ? (
                <form onSubmit={create} className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder="Nome do catálogo (ex.: Cinema Russo)"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm placeholder:text-zinc-600 focus:border-accent/60"
                  />
                  <button type="submit" disabled={busy === "create" || !name.trim()} aria-label="Criar catálogo" className="rounded-full bg-accent p-2 text-black transition hover:brightness-110 disabled:opacity-50">
                    {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-accent transition hover:bg-surface-2"
                >
                  <FolderPlus className="h-4 w-4" aria-hidden="true" />
                  Novo catálogo
                </button>
              )}
              {error && <p role="alert" className="mt-2 px-1 text-xs text-red-400">{error}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
