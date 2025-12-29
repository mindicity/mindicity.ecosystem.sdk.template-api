import { registerAs } from '@nestjs/config';

import { z } from 'zod';

import { EnvUtil } from '../../common/utils/env.util';

/**
 * Database configuration schema using Zod for validation.
 * Validates PostgreSQL connection parameters, pool settings, and retry configuration.
 */
const DatabaseConfigSchema = z.object({
  host: z.string().min(1, 'Database host is required'),
  port: z.coerce.number().int().min(1).max(65535).default(5432),
  username: z.string().min(1, 'Database username is required'),
  password: z.string().min(1, 'Database password is required'),
  database: z.string().min(1, 'Database name is required'),
  ssl: z.boolean().default(false),
  poolMin: z.coerce.number().int().min(0).default(2),
  poolMax: z.coerce.number().int().min(1).default(10),
  connectionTimeoutMillis: z.coerce.number().int().min(1000).default(30000),
  idleTimeoutMillis: z.coerce.number().int().min(1000).default(30000),
  retryAttempts: z.coerce.number().int().min(1).default(6),
  retryDelay: z.coerce.number().int().min(1000).default(10000),
  checkConnection: z.boolean().default(false),
});

/**
 * Database configuration factory function.
 * Validates environment variables and returns typed configuration object.
 * @returns Validated database configuration object
 */
export const databaseConfig = registerAs('database', () => {
  const config = {
    host: EnvUtil.parseString(process.env.DB_HOST, 'localhost'),
    port: EnvUtil.parseNumber(process.env.DB_PORT, 5432),
    username: EnvUtil.parseString(process.env.DB_USERNAME, 'postgres'),
    password: EnvUtil.parseString(process.env.DB_PASSWORD, 'password'),
    database: EnvUtil.parseString(process.env.DB_DATABASE, 'postgis'),
    ssl: EnvUtil.parseBoolean(process.env.DB_SSL, false),
    poolMin: EnvUtil.parseNumber(process.env.DB_POOL_MIN, 2),
    poolMax: EnvUtil.parseNumber(process.env.DB_POOL_MAX, 10),
    connectionTimeoutMillis: EnvUtil.parseNumber(process.env.DB_CONNECTION_TIMEOUT, 30000),
    idleTimeoutMillis: EnvUtil.parseNumber(process.env.DB_IDLE_TIMEOUT, 30000),
    retryAttempts: EnvUtil.parseNumber(process.env.DB_RETRY_ATTEMPTS, 6),
    retryDelay: EnvUtil.parseNumber(process.env.DB_RETRY_DELAY, 10000),
    checkConnection: EnvUtil.parseBoolean(process.env.DB_CHECK, false),
  };

  return DatabaseConfigSchema.parse(config);
});

/**
 * Type definition for database configuration.
 */
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;