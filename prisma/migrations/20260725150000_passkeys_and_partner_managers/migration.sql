-- Partner-facing profile copy + partner→manager ownership link
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessBrief" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "managedByPartnerId" TEXT;

CREATE INDEX IF NOT EXISTS "User_managedByPartnerId_idx" ON "User"("managedByPartnerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_managedByPartnerId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_managedByPartnerId_fkey"
      FOREIGN KEY ("managedByPartnerId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- WebAuthn passkeys
CREATE TABLE IF NOT EXISTS "UserPasskey" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "publicKey" BYTEA NOT NULL,
  "counter" INTEGER NOT NULL DEFAULT 0,
  "transports" TEXT,
  "deviceType" TEXT,
  "backedUp" BOOLEAN NOT NULL DEFAULT false,
  "label" TEXT NOT NULL DEFAULT 'Passkey',
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPasskey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserPasskey_credentialId_key" ON "UserPasskey"("credentialId");
CREATE INDEX IF NOT EXISTS "UserPasskey_userId_idx" ON "UserPasskey"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPasskey_userId_fkey'
  ) THEN
    ALTER TABLE "UserPasskey"
      ADD CONSTRAINT "UserPasskey_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "WebAuthnChallenge" (
  "id" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "userId" TEXT,
  "challenge" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WebAuthnChallenge_handle_key" ON "WebAuthnChallenge"("handle");
CREATE INDEX IF NOT EXISTS "WebAuthnChallenge_expiresAt_idx" ON "WebAuthnChallenge"("expiresAt");
