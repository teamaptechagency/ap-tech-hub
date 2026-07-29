UPDATE "User"
SET "partnerType" = 'SO_PARTNER'
WHERE "role" = 'BUSINESS_PARTNER' AND "partnerType" IS NULL;

UPDATE "User"
SET "partnerType" = 'REFERENCE_PARTNER'
WHERE "role" = 'REFERRAL_PARTNER' AND "partnerType" IS NULL;

UPDATE "User" manager
SET "partnerType" = owner."partnerType"
FROM "User" owner
WHERE manager."role" = 'PARTNER_MANAGER'
  AND manager."managedByPartnerId" = owner."id"
  AND manager."partnerType" IS NULL
  AND owner."partnerType" IS NOT NULL;
