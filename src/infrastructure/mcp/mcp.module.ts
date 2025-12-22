import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import mcpConfig from '../../config/mcp.config';
import { McpServerService } from './mcp-server.service';

/**
 * MCP Module provides Model Context Protocol server functionality.
 * 
 * This module sets up an MCP server that allows AI agents to interact
 * with the API through structured tools and resources.
 * 
 * Features:
 * - Configurable MCP server with environment-based settings
 * - Built-in tools for API information, health checks, and endpoint listing
 * - Extensible architecture for adding custom tools and resources
 * - Integration with existing logging and configuration systems
 * 
 * @example
 * ```typescript
 * // Import in AppModule
 * @Module({
 *   imports: [McpModule],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  imports: [
    ConfigModule.forFeature(mcpConfig),
  ],
  providers: [
    McpServerService,
    ContextLoggerService,
  ],
  exports: [McpServerService],
})
export class McpModule {}