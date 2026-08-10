-- Client.balance is a cached wallet value. Historical code included ordinary
-- service invoice payments in this cache even though those payments are
-- agency revenue, not advance credit held for the client. Rebuild every cache
-- from the wallet-only ledger kinds; INVOICE_PAYMENT is intentionally omitted.
UPDATE "Client" AS client
SET "balance" = COALESCE((
  SELECT SUM(txn."amount")
  FROM "ClientTxn" AS txn
  WHERE txn."clientId" = client."id"
    AND txn."kind" IN (
      'ADVANCE',
      'ADJUSTMENT',
      'POINT_EXCHANGE',
      'INVOICE_DEDUCT',
      'REFUND'
    )
), 0);
