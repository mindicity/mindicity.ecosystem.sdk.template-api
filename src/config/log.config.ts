import { registerAs } from '@nestjs/config';

import { z } from 'zod';

import { EnvUtil } from '../common/utils/env.util';

/**
 * Zod schema for logging configuration validation.
 * Validates and transforms logging-related environment variables.
 *
 * @see {@link https://getpino.io} Pino logging library documentation
 */
const LogConfigSchema = z.object({
  /** Log level for filtering messages */
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('debug'),
  /** Log transport method (console, file, both) */
  transports: z.string().default('console'),
  /** Log message prefix */
  prefix: z.string().default('api'),
  /** Enable pretty printing for development (human-readable format) */
  prettyPrint: z.boolean().default(false),
  /** HTTP request details logging level */
  httpDetails: z.enum(['none', 'basic', 'full']).default('basic'),
  /** Maximum file size before rotation (e.g., "5MB", "10MB", "1GB") */
  fileMaxSize: z.string().default('5MB'),
  /** File rotation frequency ("daily", "hourly", "weekly") */
  fileFrequency: z.enum(['daily', 'hourly', 'weekly']).default('daily'),
});

/**
 * Type definition for logging configuration.
 * Inferred from the Zod schema to ensure type safety.
 */
export type LogConfig = z.infer<typeof LogConfigSchema>;

/**
 * Logging configuration factory function.
 *
 * Loads logging configuration from environment variables and validates them using Zod schema.
 * Used by nestjs-pino to configure the Pino logger instance.
 *
 * @returns {LogConfig} Validated and typed logging configuration object
 * @throws {ZodError} When environment variables fail validation
 *
 * @example
 * ```typescript
 * // In LoggerModule configuration
 * LoggerModule.forRootAsync({
 *   inject: [ConfigService],
 *   useFactory: (configService: ConfigService) => {
 *     const logConfig = configService.get<LogConfig>('log');
 *     return { pinoHttp: { level: logConfig.level } };
 *   },
 * })
 * ```
 *
 * Environment variables:
 * - APP_LOG_LEVEL: Log level - trace, debug, info, warn, error, fatal (default: 'debug')
 * - APP_LOG_TRANSPORTS: Transport method (default: 'console')
 * - APP_LOG_PREFIX: Message prefix (default: 'api')
 * - APP_LOG_PRETTY_PRINT: Enable pretty printing for development - true, false (default: false)
 * - APP_LOG_HTTP_DETAILS: HTTP request details - none, basic, full (default: 'basic')
 * - APP_LOG_FILE_MAX_SIZE: Maximum file size before rotation - e.g., "5MB", "10MB", "1GB" (default: '5MB')
 * - APP_LOG_FILE_FREQUENCY: File rotation frequency - daily, hourly, weekly (default: 'daily')
 */
export default registerAs('log', (): LogConfig => {
  const config = {
    level: EnvUtil.parseEnum(
      process.env.APP_LOG_LEVEL,
      ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
      'debug'
    ),
    transports: EnvUtil.parseString(process.env.APP_LOG_TRANSPORTS, 'console'),
    prefix: EnvUtil.parseString(process.env.APP_LOG_PREFIX, 'api'),
    prettyPrint: EnvUtil.parseBoolean(process.env.APP_LOG_PRETTY_PRINT, false),
    httpDetails: EnvUtil.parseEnum(
      process.env.APP_LOG_HTTP_DETAILS,
      ['none', 'basic', 'full'],
      'basic'
    ),
    fileMaxSize: EnvUtil.parseString(process.env.APP_LOG_FILE_MAX_SIZE, '5MB'),
    fileFrequency: EnvUtil.parseEnum(
      process.env.APP_LOG_FILE_FREQUENCY,
      ['daily', 'hourly', 'weekly'],
      'daily'
    ),
  };

  return LogConfigSchema.parse(config);
});
