// Autenticação baseada em usuários com JWT (HS256) em cookie httpOnly.
// Papéis: ADMIN (gerencia usuários + catálogos), COLLABORATOR (cataloga no catálogo
// compartilhado) e MEMBER (catálogos próprios, independentes do principal).
import { SignJWT, jwtVerify } from "jose";
import { compare, hash as bcryptHash } from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "filmografia_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export type Role = "ADMIN" | "COLLABORATOR" | "MEMBER";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET não configurada (mínimo 16 caracteres)");
  }
  return new TextEncoder().encode(secret);
}

// ---------- Senhas ----------

export async function hashPassword(password: string): Promise<string> {
  return bcryptHash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await compare(password, passwordHash);
  } catch {
    return false;
  }
}

// ---------- Tokens de sessão ----------

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role as Role,
    };
  } catch {
    return null; // expirado, inválido ou segredo trocado
  }
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ---------- Leitura da sessão ----------

/** Para Route Handlers: extrai e valida a sessão do header Cookie. */
export async function getSessionFromRequest(req: Request): Promise<SessionUser | null> {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const token = match.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;
  return verifySessionToken(token);
}

/** Para Server Components: lê a sessão dos cookies do Next. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Sessão válida + usuário ainda existente/ativo no banco. */
export async function getActiveUser(session: SessionUser | null) {
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!user || !user.active) return null;
  return user;
}

/** Bootstrap: enquanto não existir nenhum usuário, permite criar o primeiro ADMIN. */
export async function needsBootstrap(): Promise<boolean> {
  const count = await prisma.user.count();
  return count === 0;
}
