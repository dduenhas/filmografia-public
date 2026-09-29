import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { getSession, needsBootstrap } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // quem já tem sessão válida não precisa ver o login
  if (await getSession()) redirect("/");

  // primeiro acesso (nenhum usuário no banco) → modo bootstrap cria o ADMIN
  let bootstrap = false;
  try {
    bootstrap = await needsBootstrap();
  } catch {
    // banco indisponível: mantém modo login; o formulário exibirá o erro
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="flex items-center gap-2 text-2xl font-bold">
        <Clapperboard className="h-7 w-7 text-accent" aria-hidden="true" />
        Film<span className="text-accent">o</span>grafia
      </div>
      <p className="max-w-sm text-center text-sm text-zinc-400">
        {bootstrap
          ? "Bem-vindo! Crie a conta de administrador para começar."
          : "Entre para gerenciar seu catálogo de filmes."}
      </p>
      <Suspense fallback={null}>
        <LoginForm mode={bootstrap ? "bootstrap" : "login"} />
      </Suspense>
    </div>
  );
}
