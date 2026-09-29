// Catálogos: cada usuário pode organizar filmes em múltiplos catálogos.
// - Compartilhado ("Catálogo principal"): colaborativo entre ADMIN e COLLABORATOR.
// - Pessoais: dono é o único com acesso; MEMBER começa apenas com os próprios.
// O catálogo em uso fica num cookie (CATALOG_COOKIE), validado a cada request.
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/auth";

export const CATALOG_COOKIE = "filmografia_catalog";
export const CATALOG_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias
export const SHARED_CATALOG_ID = "catalogo-principal";

export interface AccessibleCatalog {
  id: string;
  name: string;
  isShared: boolean;
  ownerId: string | null;
}

export interface ActiveUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

type CatalogRow = { id: string; name: string; isShared: boolean; ownerId: string | null; owner?: { role: Role } | null };

// Select padrão já incluindo o papel do dono (necessário para a regra de time).
export const CATALOG_ACCESS_SELECT = {
  id: true,
  name: true,
  isShared: true,
  ownerId: true,
  owner: { select: { role: true } },
} as const;

const CATALOG_SELECT = CATALOG_ACCESS_SELECT;

/** Catálogo compartilhado principal (criado sob demanda; a migração já o insere). */
export async function getSharedCatalog(): Promise<CatalogRow> {
  return prisma.catalog.upsert({
    where: { id: SHARED_CATALOG_ID },
    create: { id: SHARED_CATALOG_ID, name: "Catálogo principal", isShared: true },
    update: {},
    select: CATALOG_SELECT,
  });
}

/** Garante que o usuário tenha ao menos um catálogo próprio "Meu catálogo". */
export async function ensureOwnCatalog(user: ActiveUser): Promise<CatalogRow> {
  const existing = await prisma.catalog.findFirst({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    select: CATALOG_SELECT,
  });
  if (existing) return existing;
  return prisma.catalog.create({
    data: { name: "Meu catálogo", ownerId: user.id },
    select: CATALOG_SELECT,
  });
}

/** Cria o catálogo padrão de um novo MEMBER (começa zerado). */
export async function createDefaultCatalogFor(user: { id: string; name: string }) {
  return prisma.catalog.create({
    data: { name: `Catálogo de ${user.name}`, ownerId: user.id },
    select: CATALOG_SELECT,
  });
}

/** Catálogos que o usuário pode ver.
 *  - MEMBER: apenas os próprios (coleção independente).
 *  - ADMIN/COLLABORATOR (time): o compartilhado + TODOS os catálogos pessoais do time,
 *    para que dois usuários gerenciem a mesma coleção e os catálogos nichados um do outro.
 */
export async function listAccessibleCatalogs(user: ActiveUser): Promise<AccessibleCatalog[]> {
  if (user.role === "MEMBER") {
    const own = await prisma.catalog.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "asc" },
      select: CATALOG_SELECT,
    });
    return own.length > 0 ? own : [await ensureOwnCatalog(user)];
  }
  return prisma.catalog.findMany({
    where: {
      OR: [
        { isShared: true },
        { owner: { role: { in: ["ADMIN", "COLLABORATOR"] } } },
      ],
    },
    orderBy: [{ isShared: "desc" }, { createdAt: "asc" }],
    select: CATALOG_SELECT,
  });
}

export interface CatalogAccess {
  isShared: boolean;
  ownerId: string | null;
  /** Papel do dono (vem do CATALOG_ACCESS_SELECT); ausente em selects mínimos. */
  owner?: { role: Role } | null;
}

/** Leitura:
 *  - Compartilhado: visível ao time (ADMIN/COLLABORATOR), nunca a MEMBER.
 *  - Pessoal: MEMBER só vê os próprios; o time vê os próprios e os dos demais
 *    membros do time (catálogos de MEMBER permanecem privados).
 */
export function canViewCatalog(user: ActiveUser, catalog: CatalogAccess): boolean {
  if (catalog.isShared) return user.role !== "MEMBER";
  if (user.role === "MEMBER") return catalog.ownerId === user.id;
  if (catalog.ownerId === user.id) return true;
  return catalog.owner ? catalog.owner.role !== "MEMBER" : false;
}

/** Escrita: mesmas regras de leitura — o time co-gerencia os catálogos. */
export function canWriteCatalog(user: ActiveUser, catalog: CatalogAccess): boolean {
  return canViewCatalog(user, catalog);
}

export interface ResolvedCatalog extends CatalogRow {
  movieCount?: number;
}

/**
 * Catálogo em uso: lê o cookie e valida o acesso; sem cookie (ou inválido),
 * usa o compartilhado para ADMIN/COLLABORATOR e o próprio para MEMBER.
 */
export async function resolveCurrentCatalog(user: ActiveUser): Promise<ResolvedCatalog> {
  const store = await cookies();
  const cookieId = store.get(CATALOG_COOKIE)?.value;
  if (cookieId) {
    const catalog = await prisma.catalog.findUnique({ where: { id: cookieId }, select: CATALOG_SELECT });
    if (catalog && canViewCatalog(user, catalog)) return catalog;
  }
  const fallback = user.role === "MEMBER" ? await ensureOwnCatalog(user) : await getSharedCatalog();
  return fallback;
}

/** Mesma resolução, porém para Route Handlers (cookie lido do header da request). */
export async function resolveCurrentCatalogFromRequest(req: Request, user: ActiveUser): Promise<ResolvedCatalog> {
  const cookieId = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CATALOG_COOKIE}=`))
    ?.slice(CATALOG_COOKIE.length + 1);
  if (cookieId) {
    const catalog = await prisma.catalog.findUnique({ where: { id: cookieId }, select: CATALOG_SELECT });
    if (catalog && canViewCatalog(user, catalog)) return catalog;
  }
  return user.role === "MEMBER" ? await ensureOwnCatalog(user) : await getSharedCatalog();
}

export function catalogCookieHeader(catalogId: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CATALOG_COOKIE}=${catalogId}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${CATALOG_COOKIE_MAX_AGE}`;
}

// ---------- Compartilhamento público (somente leitura) ----------

/** Gera um token opaco e imprevisível para o link público do catálogo. */
function newShareToken(): string {
  return randomBytes(12).toString("base64url");
}

/** Catálogo público a partir do token do link compartilhado; null se inválido/desativado. */
export async function getPublicCatalogByToken(token: string): Promise<{ id: string; name: string } | null> {
  if (!token) return null;
  return prisma.catalog.findUnique({ where: { shareToken: token }, select: { id: true, name: true } });
}

/** Token atual do catálogo (null se o compartilhamento estiver desativado). */
export async function getShareToken(catalogId: string): Promise<string | null> {
  const row = await prisma.catalog.findUnique({ where: { id: catalogId }, select: { shareToken: true } });
  return row?.shareToken ?? null;
}

/** Cria (ou retorna, se já existir) o token de compartilhamento do catálogo. */
export async function ensureShareToken(catalogId: string): Promise<string> {
  const existing = await getShareToken(catalogId);
  if (existing) return existing;
  const token = newShareToken();
  await prisma.catalog.update({ where: { id: catalogId }, data: { shareToken: token } });
  return token;
}

/** Desativa o link público do catálogo. */
export async function revokeShareToken(catalogId: string): Promise<void> {
  await prisma.catalog.update({ where: { id: catalogId }, data: { shareToken: null } });
}
