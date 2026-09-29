-- Localização física da obra (tudo opcional) adicionada ao filme do catálogo.
ALTER TABLE "Movie" ADD COLUMN "location" TEXT;
ALTER TABLE "Movie" ADD COLUMN "shelf" TEXT;
ALTER TABLE "Movie" ADD COLUMN "rack" TEXT;
ALTER TABLE "Movie" ADD COLUMN "numbering" TEXT;
