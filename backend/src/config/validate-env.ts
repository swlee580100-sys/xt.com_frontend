import { z } from 'zod';

const numericString = (label: string, defaultValue: string) =>
  z
    .string()
    .default(defaultValue)
    .refine(value => !Number.isNaN(Number(value)), { message: `${label} must be numeric` });

const urlString = (label: string, defaultValue: string) =>
  z
    .string()
    .default(defaultValue)
    .refine(
      value => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      { message: `${label} must be a valid URL` }
    );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  HTTP_HOST: z.string().optional(),
  HTTP_PORT: numericString('HTTP_PORT', '3000'),
  HTTP_CORS_ORIGIN: z.string().optional(),
  DATABASE_URL: urlString('DATABASE_URL', 'mysql://root:password@localhost:3306/crypto_sim'),
  JWT_ACCESS_TOKEN_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_TOKEN_SECRET must be at least 16 chars')
    .default('dev-access-token-secret'),
  JWT_ACCESS_TOKEN_TTL: z.string().default('15m'),
  JWT_REFRESH_TOKEN_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_TOKEN_SECRET must be at least 16 chars')
    .default('dev-refresh-token-secret'),
  JWT_REFRESH_TOKEN_TTL: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: numericString('BCRYPT_SALT_ROUNDS', '12'),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: numericString('REDIS_PORT', '6379'),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_CACHE_DB: numericString('REDIS_CACHE_DB', '0'),
  REDIS_BULLMQ_DB: numericString('REDIS_BULLMQ_DB', '1'),
  REDIS_SESSION_DB: numericString('REDIS_SESSION_DB', '2'),
  CACHE_TTL_SECONDS: numericString('CACHE_TTL_SECONDS', '60'),
  QUEUE_PREFIX: z.string().optional(),
  RATE_LIMIT_TTL: numericString('RATE_LIMIT_TTL', '60'),
  RATE_LIMIT_LIMIT: numericString('RATE_LIMIT_LIMIT', '100'),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: numericString('MAIL_PORT', '587'),
  MAIL_USER: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().email().default('no-reply@example.com'),
  BINANCE_WS_BASE_URL: urlString(
    'BINANCE_WS_BASE_URL',
    'wss://stream.binance.com:9443/ws'
  ).optional(),
  BINANCE_SYMBOLS: z.string().optional(),
  BINANCE_RECONNECT_DELAY: numericString('BINANCE_RECONNECT_DELAY', '5'),
  COINGECKO_BASE_URL: urlString(
    'COINGECKO_BASE_URL',
    'https://api.coingecko.com/api/v3'
  ).optional(),
  COINGECKO_POLL_INTERVAL: numericString('COINGECKO_POLL_INTERVAL', '300')
});

export default (config: Record<string, unknown>) => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.errors.map(error => `${error.path.join('.')}: ${error.message}`);
    throw new Error(`Invalid environment configuration: ${message.join(', ')}`);
  }

  return config;
};
