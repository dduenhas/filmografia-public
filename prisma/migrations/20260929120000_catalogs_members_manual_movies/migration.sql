-- AlterEnum: novo papel MEMBER (catálogos independentes)
ALTER TYPE "Role" ADD VALUE 'MEMBER';

-- CreateTable
CREATE TABLE "Catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Catalog_pkey" PRIMARY KEY ("id")
);

-- AlterTable: filmes passam a pertencer a um catálogo; tmdbId vira opcional (cadastro manual)
ALTER TABLE "Movie" ADD COLUMN "catalogId" TEXT;
ALTER TABLE "Movie" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'TMDB';
ALTER TABLE "Movie" ADD COLUMN "trailerUrl" TEXT;
ALTER TABLE "Movie" ADD COLUMN "homepage" TEXT;
ALTER TABLE "Movie" ALTER COLUMN "tmdbId" DROP NOT NULL;

-- Backfill: cria o catálogo principal (compartilhado) e vincula os filmes existentes
INSERT INTO "Catalog" ("id", "name", "isShared", "ownerId", "createdAt", "updatedAt")
VALUES ('catalogo-principal', 'Catálogo principal', true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "Movie" SET "catalogId" = 'catalogo-principal' WHERE "catalogId" IS NULL;

ALTER TABLE "Movie" ALTER COLUMN "catalogId" SET NOT NULL;

-- Constraints / índices
ALTER TABLE "Catalog" ADD CONSTRAINT "Catalog_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "Catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "Movie_tmdbId_key";
CREATE UNIQUE INDEX "Movie_catalogId_tmdbId_key" ON "Movie"("catalogId", "tmdbId");
CREATE INDEX "Movie_catalogId_idx" ON "Movie"("catalogId");
CREATE INDEX "Catalog_ownerId_idx" ON "Catalog"("ownerId");
