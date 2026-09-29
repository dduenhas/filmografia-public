import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Proteção global: toda rota exige sessão JWT válida, exceto login e a API de auth.
// A verificação aqui é apenas criptográfica (rápida); a checagem de usuário
// ativo/papel acontece nas páginas e rotas de API.
// Obs.: o nome do cookie é duplicado de propósito para não importar "@/lib/auth"
// (que carrega o Prisma Client) no bundle do proxy.

const SESSION_COOKIE = "filmografia_session";
const PUBLIC_PREFIXES = ["/login", "/api/auth", "/c/"];

async function isTokenValid(token: string | undefined): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 16) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    // usuário já logado não precisa ver a tela de login
    if (pathname === "/login" && (await isTokenValid(request.cookies.get(SESSION_COOKIE)?.value))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (await isTokenValid(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
