import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { McpConfig } from '../../config/mcp.config';

import { McpTransport } from './transports/base-transport';
import { TransportFactory } from './transports/transport-factory';

/**
 * MCP Server Service provides Model Context Protocol server functionality.
 * 
 * This service creates an MCP server that can be connected to AI agents,
 * allowing them to interact with the API through structured tools and resources.
 * 
 * @example
 * ```typescript
 * // The MCP server automatically starts when the module initializes
 * // and provides tools for AI agents to interact with the API
 * ```
 */
@Injectable()
export class McpServerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: ContextLoggerService;
  private server: Server | null = null;
  private transport: McpTransport | null = null;
  private readonly mcpConfig: McpConfig;

  constructor(
    private readonly configService: ConfigService,
    loggerService: ContextLoggerService,
  ) {
    this.logger = loggerService.child({ serviceContext: McpServerService.name });
    this.logger.setContext(McpServerService.name);
    this.mcpConfig = this.configService.get<McpConfig>('mcp')!;
  }

  /**
   * Initialize MCP server when module starts.
   * Sets up server with tools and resources for AI agent interaction.
   */
  async onModuleInit(): Promise<void> {
    if (!this.mcpConfig.enabled) {
      this.logger.info('MCP server disabled by configuration');
      return;
    }

    try {
      await this.startMcpServer();
      this.logger.info('MCP server initialized successfully', {
        serverName: this.mcpConfig.serverName,
        version: this.mcpConfig.serverVersion,
      });
    } catch (error) {
      this.logger.error('Failed to initialize MCP server', { err: error });
      throw error;
    }
  }

  /**
   * Cleanup MCP server when module is destroyed.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.disconnect();
        this.logger.info('MCP transport disconnected successfully');
      } catch (error) {
        this.logger.error('Error disconnecting MCP transport', { err: error });
      }
    }

    if (this.server) {
      try {
        await this.server.close();
        this.logger.info('MCP server closed successfully');
      } catch (error) {
        this.logger.error('Error closing MCP server', { err: error });
      }
    }
  }

  /**
   * Start the MCP server with configured transport.
   * @private
   */
  private async startMcpServer(): Promise<void> {
    // Create transport based on configuration
    this.transport = TransportFactory.createTransport({
      transport: this.mcpConfig.transport,
      port: this.mcpConfig.port,
      host: this.mcpConfig.host,
      serverName: this.mcpConfig.serverName,
      serverVersion: this.mcpConfig.serverVersion,
    });

    // Create MCP server
    this.server = new Server(
      {
        name: this.mcpConfig.serverName,
        version: this.mcpConfig.serverVersion,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Set up tool handlers
    this.setupToolHandlers();

    // Set up resource handlers
    this.setupResourceHandlers();

    // Connect transport to server
    await this.transport.connect(this.server);

    const transportInfo = this.transport.getTransportInfo();
    this.logger.info('MCP server connected and ready for AI agent connections', {
      serverName: this.mcpConfig.serverName,
      version: this.mcpConfig.serverVersion,
      transport: transportInfo.type,
      ...transportInfo.details,
    });
  }

  /**
   * Set up MCP tool handlers for AI agent interactions.
   * @private
   */
  private setupToolHandlers(): void {
    if (!this.server) return;

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      this.logger.trace('MCP tools list requested');
      
      return {
        tools: [
          {
            name: 'get_api_info',
            description: 'Get information about the API server including health status and configuration',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'get_api_health',
            description: 'Check the health status of the API server',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'list_api_endpoints',
            description: 'List all available API endpoints with their methods and descriptions',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, (request) => {
      const { name, arguments: args } = request.params;
      
      this.logger.trace('MCP tool called', { toolName: name, arguments: args });

      switch (name) {
        case 'get_api_info':
          return this.handleGetApiInfo();
        
        case 'get_api_health':
          return this.handleGetApiHealth();
        
        case 'list_api_endpoints':
          return this.handleListApiEndpoints();
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Set up MCP resource handlers for AI agent access to API resources.
   * @private
   */
  private setupResourceHandlers(): void {
    if (!this.server) return;

    // Resources can be added here for providing API documentation,
    // schemas, or other resources that AI agents might need
    this.logger.debug('MCP resource handlers configured');
  }

  /**
   * Handle get_api_info tool call.
   * @private
   */
  private handleGetApiInfo(): { content: Array<{ type: string; text: string }> } {
    const appConfig = this.configService.get('app');
    const apiInfo = this.buildApiInfo(appConfig);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(apiInfo, null, 2),
        },
      ],
    };
  }

  /**
   * Build API information object.
   * @private
   */
  private buildApiInfo(appConfig: unknown): Record<string, unknown> {
    const config = this.extractAppConfig(appConfig);
    
    return {
      name: this.mcpConfig.serverName,
      version: this.mcpConfig.serverVersion,
      port: config.port,
      apiPrefix: config.apiPrefix,
      apiScopePrefix: config.apiScopePrefix,
      corsEnabled: config.corsEnabled,
      swaggerUrl: `${config.swaggerHostname}${config.apiPrefix}/docs/swagger/ui`,
    };
  }

  /**
   * Extract and normalize app configuration values.
   * @private
   */
  private extractAppConfig(appConfig: unknown): {
    port: number;
    apiPrefix: string;
    apiScopePrefix: string;
    corsEnabled: boolean;
    swaggerHostname: string;
  } {
    const config = appConfig as {
      port?: number;
      apiPrefix?: string;
      apiScopePrefix?: string;
      corsEnabled?: boolean;
      swaggerHostname?: string;
    };

    return {
      port: this.getConfigValue(config?.port, 3232),
      apiPrefix: this.getConfigValue(config?.apiPrefix, '/mcapi'),
      apiScopePrefix: this.getConfigValue(config?.apiScopePrefix, ''),
      corsEnabled: this.getConfigValue(config?.corsEnabled, true),
      swaggerHostname: this.getConfigValue(config?.swaggerHostname, 'http://localhost:3232'),
    };
  }

  /**
   * Get configuration value with fallback.
   * @private
   */
  private getConfigValue<T>(value: T | undefined, defaultValue: T): T {
    return value ?? defaultValue;
  }

  /**
   * Handle get_api_health tool call.
   * @private
   */
  private handleGetApiHealth(): { content: Array<{ type: string; text: string }> } {
    // This would typically make an actual health check call to the API
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(healthStatus, null, 2),
        },
      ],
    };
  }

  /**
   * Handle list_api_endpoints tool call.
   * @private
   */
  private handleListApiEndpoints(): { content: Array<{ type: string; text: string }> } {
    const appConfig = this.configService.get('app');
    const baseUrl = `${appConfig?.apiPrefix ?? '/mcapi'}${appConfig?.apiScopePrefix ?? ''}`;
    
    const endpoints = [
      {
        method: 'GET',
        path: `${baseUrl}/health`,
        description: 'Health check endpoint',
      },
      {
        method: 'GET',
        path: `${baseUrl}/template`,
        description: 'Template module endpoints (to be customized)',
      },
      {
        method: 'GET',
        path: `${appConfig?.apiPrefix ?? '/mcapi'}/docs/swagger/ui`,
        description: 'Swagger API documentation',
      },
    ];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(endpoints, null, 2),
        },
      ],
    };
  }
}