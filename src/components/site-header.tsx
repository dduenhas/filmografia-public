import Link from "next/link";
import { Clapperboard, LayoutDashboard } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { UserMenu } from "@/components/user-menu";
import { getSession } from "@/lib/auth";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight" aria-label="Filmografia — página inicial">
          <Clapperboard className="h-6 w-6 text-accent" aria-hidden="true" />
          <span className="hidden text-lg sm:inline">
            Film<span className="text-accent">o</span>grafia
          </span>
        </Link>

        {/* A busca em APIs externas (TMDB) é exclusiva de usuários autenticados. */}
        {session ? (
          <div className="min-w-0 flex-1">
            <SearchBox />
          </div>
        ) : (
          <div className="min-w-0 flex-1" aria-hidden="true" />
        )}

        {session?.role === "ADMIN" && (
          <Link
            href="/dashboard"
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-zinc-300 transition hover:border-accent/50 hover:text-foreground md:inline-flex"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        )}

        {session && <UserMenu name={session.name} role={session.role} />}
      </div>
    </header>
  );
}
