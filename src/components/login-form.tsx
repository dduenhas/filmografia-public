"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, ShieldCheck, User } from "lucide-react";

interface Props {
  mode: "login" | "bootstrap";
}

export function LoginForm({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBootstrap = mode === "bootstrap";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const form = new FormData(e.currentTarget);
      const payload = isBootstrap
        ? {
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            confirmPassword: String(form.get("confirmPassword") ?? ""),
          }
        : {
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          };

      const res = await fetch(isBootstrap ? "/api/auth/bootstrap" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha na autenticação");
      }
      const from = searchParams.get("from") ?? "/";
      // evita open-redirect: só aceita caminhos relativos simples (não "//host")
      router.push(from.startsWith("/") && !from.startsWith("//") ? from : "/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm focus:border-accent/60";

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      {isBootstrap && (
        <>
          <p className="rounded-xl border border-accent/30 bg-accent-soft p-3 text-xs text-accent">
            Primeiro acesso: crie a conta de <strong>administrador</strong>. Ela poderá cadastrar colaboradores no
            Dashboard.
          </p>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-300">
              Nome
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <input id="name" name="name" type="text" required minLength={2} maxLength={80} autoComplete="name" className={inputClass} />
            </div>
          </div>
        </>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-300">
          E-mail
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete={isBootstrap ? "off" : "username"}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-300">
          Senha{isBootstrap && <span className="ml-1 text-xs text-zinc-500">(mínimo 8 caracteres)</span>}
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isBootstrap ? 8 : 1}
            maxLength={200}
            autoComplete={isBootstrap ? "new-password" : "current-password"}
            className={inputClass}
          />
        </div>
      </div>

      {isBootstrap && (
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-zinc-300">
            Confirmar senha
          </label>
          <div className="relative">
            <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              maxLength={200}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isBootstrap ? "Criar administrador e entrar" : "Entrar"}
      </button>
    </form>
  );
}
