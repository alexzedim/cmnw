export const marketConfig = {
  retentionHours: Number(process.env.MARKET_RETENTION_HOURS) || 48,
  // pg protocol caps a statement at 65535 bind params; market rows carry 19
  // columns, so multi-row INSERT batches must stay well under 3400
  diffBatchSize: Number(process.env.MARKET_DIFF_BATCH_SIZE) || 2_000,
  ttlBatchSize: Number(process.env.MARKET_TTL_BATCH_SIZE) || 50_000,
};
