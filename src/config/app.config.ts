import { registerAs } from '@nestjs/config';

import { z } from 'zod';

import { EnvUtil } from '../common/utils/env.util';

/**
 * Zod schema for application configuration validation.
 * Validates and transforms environment variables into typed configuration object.
 *
 * @see {@link https://zod.dev} Zod validation library documentation
 */
const AppConfigSchema = z.object({
  /** Server port number (1-65535) */
  port: z.number().int().min(1).max(65535).default(3232),
  /** API route prefix (e.g., '/mcapi') */
  apiPrefix: z.string().default('/mcapi'),
  /** Additional API scope prefix for multi-tenant scenarios */
  apiScopePrefix: z.string().default(''),
  /** Enable CORS middleware */
  corsEnabled: z.boolean().default(true),
  /** Include detailed error information in responses */
  errDetail: z.boolean().default(false),
  /** Include error messages in responses */
  errMessage: z.boolean().default(false),
  /** Maximum request body size */
  bodyParserLimit: z.string().default('20MB'),
  /** Enable gzip compression */
  enableCompression: z.boolean().default(true),
  /** Swagger documentation hostname */
  swaggerHostname: z.string().default('http://localhost:3232'),
  /** Swagger authentication type (bearer, basic, apikey, none) */
  swaggerAuth: z.enum(['bearer', 'basic', 'apikey', 'none']).default('bearer'),
});

/**
 * Type definition for application configuration.
 * Inferred from the Zod schema to ensure type safety.
 */
export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Application configuration factory function.
 *
 * Loads configuration from environment variables and validates them using Zod schema.
 * Throws validation error if any required environment variable is invalid.
 *
 * @returns {AppConfig} Validated and typed configuration object
 * @throws {ZodError} When environment variables fail validation
 *
 * @example
 * ```typescript
 * // In a service or controller
 * constructor(private configService: ConfigService) {
 *   const appConfig = this.configService.get<AppConfig>('app');
 *   console.log(appConfig.port); // Type-safe access
 * }
 * ```
 *
 * Environment variables:
 * - APP_PORT: Server port (default: 3232)
 * - APP_API_PREFIX: API route prefix (default: '/mcapi')
 * - APP_API_SCOPE_PREFIX: Additional scope prefix (default: '')
 * - APP_CORS_ENABLED: Enable CORS (default: true)
 * - APP_ERR_DETAIL: Include error details (default: false)
 * - APP_ERR_MESSAGE: Include error messages (default: false)
 * - APP_BODYPARSER_LIMIT: Max body size (default: '20MB')
 * - APP_ENABLE_COMPRESSION: Enable compression (default: true)
 * - APP_SWAGGER_HOSTNAME: Swagger hostname (default: 'http://localhost:3232')
 * - APP_SWAGGER_AUTH: Swagger auth type (default: 'bearer')
 */
export default registerAs('app', (): AppConfig => {
  const config = {
    port: EnvUtil.parseNumber(process.env.APP_PORT, 3232),
    apiPrefix: EnvUtil.parseString(process.env.APP_API_PREFIX, '/mcapi'),
    apiScopePrefix: EnvUtil.parseString(process.env.APP_API_SCOPE_PREFIX, ''),
    corsEnabled: EnvUtil.parseBoolean(process.env.APP_CORS_ENABLED, true),
    errDetail: EnvUtil.parseBoolean(process.env.APP_ERR_DETAIL, false),
    errMessage: EnvUtil.parseBoolean(process.env.APP_ERR_MESSAGE, false),
    bodyParserLimit: EnvUtil.parseString(process.env.APP_BODYPARSER_LIMIT, '20MB'),
    enableCompression: EnvUtil.parseBoolean(process.env.APP_ENABLE_COMPRESSION, true),
    swaggerHostname: EnvUtil.parseString(process.env.APP_SWAGGER_HOSTNAME, 'http://localhost:3232'),
    swaggerAuth: EnvUtil.parseEnum(
      process.env.APP_SWAGGER_AUTH, 
      ['bearer', 'basic', 'apikey', 'none'], 
      'bearer'
    ),
  };

  return AppConfigSchema.parse(config);
});
