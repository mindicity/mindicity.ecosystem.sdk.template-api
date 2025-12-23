import { registerAs } from '@nestjs/config';

import { z } from 'zod';

import { EnvUtil } from '../common/utils/env.util';

/**
 * Zod schema for MCP server configuration validation.
 * Validates and transforms environment variables into typed configuration object.
 *
 * @see {@link https://modelcontextprotocol.io} Model Context Protocol documentation
 */
const McpConfigSchema = z.object({
  /** Enable MCP server */
  enabled: z.boolean().default(true),
  /** MCP server transport type */
  transport: z.enum(['http', 'sse']).default('http'),
  /** MCP server port number (1-65535) - used for HTTP and SSE transports */
  port: z.number().int().min(1, 'MCP port must be at least 1').max(65535, 'MCP port must be at most 65535').default(3235),
  /** MCP server host - used for HTTP and SSE transports */
  host: z.string().min(1, 'MCP host cannot be empty').default('localhost'),
  /** MCP server name identifier (defaults to package.json name) */
  serverName: z.string().min(1, 'MCP server name cannot be empty').default('mindicity-api-template'),
  /** MCP server version (defaults to package.json version) */
  serverVersion: z.string().min(1, 'MCP server version cannot be empty').default('1.0.0'),
});

/**
 * Type definition for MCP server configuration.
 * Inferred from the Zod schema to ensure type safety.
 */
export type McpConfig = z.infer<typeof McpConfigSchema>;

/**
 * MCP server configuration factory function.
 *
 * Loads configuration from environment variables and validates them using Zod schema.
 * Throws validation error if any required environment variable is invalid.
 *
 * @returns {McpConfig} Validated and typed configuration object
 * @throws {ZodError} When environment variables fail validation
 *
 * @example
 * ```typescript
 * // In a service or controller
 * constructor(private configService: ConfigService) {
 *   const mcpConfig = this.configService.get<McpConfig>('mcp');
 *   console.log(mcpConfig.port); // Type-safe access
 * }
 * ```
 *
 * Environment variables:
 * - MCP_ENABLED: Enable MCP server (default: true)
 * - MCP_TRANSPORT: Transport type - http, sse (default: http)
 * - MCP_PORT: MCP server port (default: 3235)
 * - MCP_HOST: MCP server host (default: localhost)
 * - MCP_SERVER_NAME: Server name identifier (default: package.json name or 'mindicity-api-template')
 * - MCP_SERVER_VERSION: Server version (default: package.json version or '1.0.0')
 */
export default registerAs('mcp', (): McpConfig => {
  const config = {
    enabled: EnvUtil.parseBoolean(process.env.MCP_ENABLED, true),
    transport: EnvUtil.parseEnum(
      process.env.MCP_TRANSPORT, 
      ['http', 'sse'], 
      'http',
      'MCP_TRANSPORT'
    ),
    port: EnvUtil.parseNumber(process.env.MCP_PORT, 3235),
    host: EnvUtil.parseString(process.env.MCP_HOST, 'localhost'),
    serverName: EnvUtil.parseString(
      process.env.MCP_SERVER_NAME, 
      process.env.npm_package_name ?? 'mindicity-api-template'
    ),
    serverVersion: EnvUtil.parseString(
      process.env.MCP_SERVER_VERSION, 
      process.env.npm_package_version ?? '1.0.0'
    ),
  };

  try {
    return McpConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      
      // eslint-disable-next-line no-console
      console.error(`❌ MCP Configuration validation failed: ${errorMessages}`);
      // eslint-disable-next-line no-console
      console.error('🔧 Please check your environment variables and fix the configuration.');
      // eslint-disable-next-line no-console
      console.error('💥 Application startup aborted due to invalid MCP configuration.');
      
      // Throw error to stop application startup
      throw new Error(`Invalid MCP configuration: ${errorMessages}`);
    }
    throw error;
  }
});