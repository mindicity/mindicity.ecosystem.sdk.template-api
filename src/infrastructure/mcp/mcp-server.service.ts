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
        },
      }
    );

    // Set up dynamic tool handlers
    this.setupDynamicToolHandlers();

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
   * Set up dynamic MCP tool handlers that automatically create tools for each API endpoint.
   * @private
   */
  private setupDynamicToolHandlers(): void {
    if (!this.server) return;

    // List available tools - dynamically generated from API endpoints
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      this.logger.trace('MCP tools list requested');
      
      const tools = this.generateDynamicTools();
      return { tools };
    });

    // Handle tool calls - dynamically route to appropriate endpoints
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      this.logger.trace('MCP tool called', { toolName: name, arguments: args });

      return this.handleDynamicToolCall(name, args);
    });

    this.logger.debug('Dynamic MCP tool handlers configured');
  }

  /**
   * Generate dynamic tools based on available API endpoints.
   * @private
   */
  private generateDynamicTools(): Array<{
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
  }> {
    const appConfig = this.configService.get('app');
    const baseUrl = `${appConfig?.apiPrefix ?? '/mcapi'}${appConfig?.apiScopePrefix ?? ''}`;
    
    // Define available API endpoints that become MCP tools
    const apiEndpoints = [
      {
        name: 'get_api_health',
        method: 'GET',
        path: `${baseUrl}/health`,
        description: 'Check the health status of the API server',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];

    return apiEndpoints.map(endpoint => ({
      name: endpoint.name,
      description: endpoint.description,
      inputSchema: endpoint.inputSchema,
    }));
  }

  /**
   * Handle dynamic tool calls by routing to appropriate API endpoints.
   * @private
   */
  private async handleDynamicToolCall(toolName: string, args: unknown): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const appConfig = this.configService.get('app');
    const baseUrl = `${appConfig?.apiPrefix ?? '/mcapi'}${appConfig?.apiScopePrefix ?? ''}`;

    switch (toolName) {
      case 'get_api_health':
        return this.callApiEndpoint('GET', `${baseUrl}/health`, args);
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Make an internal API call to the specified endpoint.
   * @private
   */
  private async callApiEndpoint(method: string, path: string, args: unknown): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    try {
      // For health endpoint, call the health handler directly
      if (path.includes('/health')) {
        return this.handleGetApiHealth();
      } else {
        throw new Error(`Endpoint not implemented: ${path}`);
      }
    } catch (error) {
      this.logger.error('Error calling API endpoint', { 
        method, 
        path, 
        args, 
        err: error 
      });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to call API endpoint',
              message: error instanceof Error ? error.message : 'Unknown error',
              endpoint: `${method} ${path}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Handle get_api_health tool call.
   * @private
   */
  private handleGetApiHealth(): { content: Array<{ type: string; text: string }> } {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: this.mcpConfig.serverName,
      version: this.mcpConfig.serverVersion,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
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
}