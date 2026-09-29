"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ShieldCheck, Trash2, User as UserIcon, UserCheck, UserX, Users } from "lucide-react";

export type CollaboratorRole = "ADMIN" | "COLLABORATOR" | "MEMBER";

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: CollaboratorRole;
  active: boolean;
  createdAt: string;
}

const ROLE_LABEL: Record<CollaboratorRole, string> = {
  ADMIN: "Administrador",
  COLLABORATOR: "Colaborador",
  MEMBER: "Membro",
};

interface Props {
  users: Collaborator[];
  currentUserId: string;
}

/** Gestão de colaboradores (somente ADMIN): criar, alterar papel, ativar/desativar, redefinir senha e excluir. */
export function CollaboratorsManager({ users, currentUserId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "COLLABORATOR" as CollaboratorRole });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function flash(message: string) {
    setOk(message);
    setError(null);
    setTimeout(() => setOk(null), 3000);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar colaborador");
      setForm({ name: "", email: "", password: "", role: "COLLABORATOR" });
      flash("Colaborador criado com sucesso.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, message: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Falha ao atualizar");
      flash(message);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(user: Collaborator) {
    if (!confirm(`Excluir o colaborador "${user.name}"? Essa ação não pode ser desfeita.`)) return;
    setBusy(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Falha ao excluir");
      flash("Colaborador excluído.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function resetPassword(user: Collaborator) {
    const pwd = prompt(`Nova senha para ${user.name} (mínimo 8 caracteres):`);
    if (!pwd) return;
    if (pwd.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    await patch(user.id, { password: pwd }, "Senha redefinida.");
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-zinc-500 focus:border-accent/60";

  return (
    <div className="space-y-6">
      {/* ===== Novo colaborador ===== */}
      <form onSubmit={create} className="rounded-2xl border border-border/70 bg-surface/50 p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          <Plus className="h-4 w-4 text-accent" aria-hidden="true" />
          Novo colaborador
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="c-name" className="mb-1 block text-xs text-zinc-500">Nome</label>
            <input id="c-name" required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="c-email" className="mb-1 block text-xs text-zinc-500">E-mail</label>
            <input id="c-email" type="email" required maxLength={200} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="c-password" className="mb-1 block text-xs text-zinc-500">Senha (mín. 8)</label>
            <input id="c-password" type="password" required minLength={8} maxLength={200} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="c-role" className="mb-1 block text-xs text-zinc-500">Papel</label>
            <select id="c-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as CollaboratorRole })} className={inputClass}>
              <option value="COLLABORATOR">Colaborador — cataloga no catálogo principal</option>
              <option value="MEMBER">Membro — catálogos próprios e independentes</option>
              <option value="ADMIN">Administrador — gerencia tudo</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={creating} className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60">
          {creating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Adicionar colaborador
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      {ok && (
        <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {ok}
        </p>
      )}

      {/* ===== Lista ===== */}
      <ul className="space-y-3">
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          const isAdmin = u.role === "ADMIN";
          const isMember = u.role === "MEMBER";
          return (
            <li key={u.id} className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${u.active ? "border-border/70 bg-surface/50" : "border-border/40 bg-surface/20 opacity-70"}`}>
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isAdmin ? "bg-accent text-black" : "bg-surface-2 text-zinc-300"}`}>
                  {isAdmin ? <ShieldCheck className="h-5 w-5" aria-hidden="true" /> : isMember ? <Users className="h-5 w-5" aria-hidden="true" /> : <UserIcon className="h-5 w-5" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {u.name}
                    {isSelf && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-normal text-zinc-400">você</span>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{u.email}</p>
                  <p className="mt-1 text-[11px]">
                    <span className={`rounded-full px-2 py-0.5 ${isAdmin ? "bg-accent/15 text-accent" : "bg-surface-2 text-zinc-400"}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                    {!u.active && <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-red-400">inativo</span>}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5">
                  <span className="sr-only">Papel de {u.name}</span>
                  <select
                    value={u.role}
                    onChange={(e) => patch(u.id, { role: e.target.value as CollaboratorRole }, `Papel atualizado para ${ROLE_LABEL[e.target.value as CollaboratorRole]}.`)}
                    disabled={busy === u.id || isSelf}
                    title={isSelf ? "Você não pode alterar o próprio papel" : "Alterar papel"}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-zinc-300 transition hover:border-accent/50 disabled:opacity-40"
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="COLLABORATOR">Colaborador</option>
                    <option value="MEMBER">Membro</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => patch(u.id, { active: !u.active }, u.active ? "Colaborador desativado." : "Colaborador ativado.")}
                  disabled={busy === u.id || isSelf}
                  title={isSelf ? "Você não pode desativar a si mesmo" : u.active ? "Desativar acesso" : "Reativar acesso"}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-zinc-300 transition hover:border-accent/50 disabled:opacity-40"
                >
                  {u.active ? <UserX className="h-3.5 w-3.5" aria-hidden="true" /> : <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                  {u.active ? "Desativar" : "Ativar"}
                </button>

                <button
                  type="button"
                  onClick={() => resetPassword(u)}
                  disabled={busy === u.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-zinc-300 transition hover:border-accent/50 disabled:opacity-40"
                >
                  Redefinir senha
                </button>

                <button
                  type="button"
                  onClick={() => remove(u)}
                  disabled={busy === u.id || isSelf}
                  title={isSelf ? "Você não pode excluir a si mesmo" : "Excluir colaborador"}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-red-400 transition hover:border-red-500/50 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Excluir
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
