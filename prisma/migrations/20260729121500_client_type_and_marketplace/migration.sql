-- Add structured client source/type so marketplace clients can still have portal access.
CREATE TYPE "ClientType" AS ENUM ('LOCAL', 'WEBSITE', 'MARKETPLACE');
CREATE TYPE "ClientMarketplace" AS ENUM ('FIVERR', 'UPWORK', 'FREELANCER');

ALTER TABLE "Client"
  ADD COLUMN "clientType" "ClientType" NOT NULL DEFAULT 'WEBSITE',
  ADD COLUMN "marketplace" "ClientMarketplace";
