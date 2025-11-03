SELECT COUNT(*) as total_count FROM "TransactionLog";
SELECT id, "orderNumber", "userId", "assetType", "status", "createdAt" FROM "TransactionLog" ORDER BY "createdAt" DESC LIMIT 10;
