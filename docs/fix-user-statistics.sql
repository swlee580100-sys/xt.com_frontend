-- 重新计算所有用户的统计数据（仅基于真实账户REAL）
-- 警告：这将覆盖所有用户的 totalProfitLoss、winRate、totalTrades 字段

-- 1. 先备份当前数据（可选）
-- CREATE TABLE "User_backup_20251027" AS SELECT * FROM "User";

-- 2. 重置所有用户的统计数据为0
UPDATE "User" SET
  "totalProfitLoss" = 0,
  "winRate" = 0,
  "totalTrades" = 0;

-- 3. 重新计算每个用户的统计数据（仅基于真实账户）
WITH user_stats AS (
  SELECT
    "userId",
    COUNT(*) as total_trades,
    SUM("actualReturn") as total_profit_loss,
    SUM(CASE WHEN "actualReturn" > 0 THEN 1 ELSE 0 END) as win_trades
  FROM "TransactionLog"
  WHERE "status" = 'SETTLED'
    AND "accountType" = 'REAL'  -- 只统计真实账户
  GROUP BY "userId"
)
UPDATE "User" u
SET
  "totalTrades" = COALESCE(us.total_trades, 0),
  "totalProfitLoss" = COALESCE(us.total_profit_loss, 0),
  "winRate" = CASE
    WHEN us.total_trades > 0 THEN (us.win_trades::numeric / us.total_trades::numeric * 100)
    ELSE 0
  END
FROM user_stats us
WHERE u.id = us."userId";

-- 4. 验证结果
SELECT
  u.email,
  u."demoBalance",
  u."realBalance",
  u."totalProfitLoss",
  u."winRate",
  u."totalTrades",
  COUNT(CASE WHEN t."accountType" = 'DEMO' AND t."status" = 'SETTLED' THEN 1 END) as demo_trades,
  COUNT(CASE WHEN t."accountType" = 'REAL' AND t."status" = 'SETTLED' THEN 1 END) as real_trades
FROM "User" u
LEFT JOIN "TransactionLog" t ON t."userId" = u.id
GROUP BY u.id, u.email, u."demoBalance", u."realBalance", u."totalProfitLoss", u."winRate", u."totalTrades"
ORDER BY u."createdAt" DESC
LIMIT 10;
