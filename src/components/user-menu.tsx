"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import type { Role } from "@/lib/auth";

interface Props {
  name: string;
  role: Role;
}

/** Menu do usuário autenticado: identifica o papel, dá acesso ao dashboard (admin) e encerra a sessão. */
export function UserMenu({ name, role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin = role === "ADMIN";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu do usuário ${name}`}
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-sm transition hover:border-accent/50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">
          {initial}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{name}</span>
      </button>

      {open && (
        <>
          {/* clique fora fecha */}
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/40"
          >
            <div className="border-b border-border/60 px-4 py-3">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-400">
                {isAdmin ? <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> : <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                {isAdmin ? "Administrador" : "Colaborador"}
              </p>
            </div>

            {isAdmin && (
              <Link
                href="/dashboard"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-surface-2 hover:text-foreground"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={logout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 transition hover:bg-surface-2 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {loggingOut ? "Saindo…" : "Sair"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
