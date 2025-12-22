import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { McpConfig } from '../../config/mcp.config';
import { HealthService } from '../../modules/health/health.service';

import { McpTransport } from './transports/base-transport';
import { TransportFactory } from './transports/transport-factory';
import { createTransportDependencies } from './transports/transport-dependencies';

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
    private readonly healthService: HealthService,
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
    // Create transport dependencies using the scalable pattern
    // This pattern scales seamlessly - add more services without changing the factory signature
    const dependencies = createTransportDependencies({
      healthService: this.healthService,
      // Future services can be added here without breaking existing code:
      // userService: this.userService,
      // notificationService: this.notificationService,
      // analyticsService: this.analyticsService,
      // databaseService: this.databaseService,
    });

    this.transport = TransportFactory.createTransport({
      transport: this.mcpConfig.transport,
      port: this.mcpConfig.port,
      host: this.mcpConfig.host,
      serverName: this.mcpConfig.serverName,
      serverVersion: this.mcpConfig.serverVersion,
    }, dependencies);

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

    // List available resources - API documentation and specs
    this.server.setRequestHandler(ListResourcesRequestSchema, () => {
      this.logger.trace('MCP resources list requested');
      
      const resources = this.generateDynamicResources();
      return { resources };
    });

    // Handle resource reads - fetch API documentation content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      this.logger.trace('MCP resource read requested', { uri });

      return this.handleDynamicResourceRead(uri);
    });

    this.logger.debug('Dynamic MCP tool and resource handlers configured');
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
   * Generate dynamic resources based on available API documentation.
   * @private
   */
  private generateDynamicResources(): Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }> {
    const appConfig = this.configService.get('app');
    const swaggerHostname = this.configService.get('app.swaggerHostname') ?? 'http://localhost:3232';
    const apiPrefix = appConfig?.apiPrefix ?? '/mcapi';
    const apiScopePrefix = appConfig?.apiScopePrefix ?? '';
    
    // Define available API documentation resources
    const apiResources = [
      {
        uri: `swagger://api-docs${apiScopePrefix}/swagger/specs`,
        name: 'API Swagger Specification',
        description: 'Complete OpenAPI/Swagger specification for the API endpoints',
        mimeType: 'application/json',
        url: `${swaggerHostname}${apiPrefix}/docs${apiScopePrefix}/swagger/specs`,
      },
      {
        uri: `swagger://api-docs${apiScopePrefix}/swagger/ui`,
        name: 'API Swagger UI',
        description: 'Interactive Swagger UI for exploring and testing API endpoints',
        mimeType: 'text/html',
        url: `${swaggerHostname}${apiPrefix}/docs${apiScopePrefix}/swagger/ui`,
      },
    ];

    return apiResources.map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    }));
  }

  /**
   * Handle dynamic resource reads by fetching API documentation content.
   * @private
   */
  private async handleDynamicResourceRead(uri: string): Promise<{
    contents: Array<{ uri: string; mimeType: string; text?: string }>;
  }> {
    const appConfig = this.configService.get('app');
    const swaggerHostname = this.configService.get('app.swaggerHostname') ?? 'http://localhost:3232';
    const apiPrefix = appConfig?.apiPrefix ?? '/mcapi';
    const apiScopePrefix = appConfig?.apiScopePrefix ?? '';

    try {
      if (uri.startsWith('swagger://api-docs')) {
        if (uri.includes('/swagger/specs')) {
          // Fetch Swagger JSON specification
          const swaggerUrl = `${swaggerHostname}${apiPrefix}/docs${apiScopePrefix}/swagger/specs`;
          return this.fetchSwaggerResource(uri, swaggerUrl, 'application/json');
        } else if (uri.includes('/swagger/ui')) {
          // Return Swagger UI information
          const swaggerUiUrl = `${swaggerHostname}${apiPrefix}/docs${apiScopePrefix}/swagger/ui`;
          return {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: `Swagger UI is available at: ${swaggerUiUrl}\n\nThis interactive documentation allows you to:\n- Explore all API endpoints\n- Test endpoints directly from the browser\n- View request/response schemas\n- Understand authentication requirements\n\nTo access the Swagger UI, open the URL above in your web browser.`,
              },
            ],
          };
        }
      }

      throw new Error(`Unknown resource URI: ${uri}`);
    } catch (error) {
      this.logger.error('Error reading MCP resource', { 
        uri, 
        err: error 
      });
      
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Error reading resource: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  /**
   * Fetch Swagger resource content from the API.
   * @private
   */
  private async fetchSwaggerResource(uri: string, url: string, mimeType: string): Promise<{
    contents: Array<{ uri: string; mimeType: string; text?: string }>;
  }> {
    try {
      // For now, return a placeholder since we can't make HTTP requests to ourselves
      // In a real implementation, you might use the HTTP client or access the Swagger document directly
      const swaggerPlaceholder = {
        openapi: '3.0.0',
        info: {
          title: this.mcpConfig.serverName,
          version: this.mcpConfig.serverVersion,
          description: 'API documentation available via Swagger UI',
        },
        servers: [
          {
            url: url.replace('/docs/project/swagger/specs', ''),
            description: 'API Server',
          },
        ],
        paths: {
          '/health/project/ping': {
            get: {
              tags: ['health'],
              summary: 'Health check endpoint',
              responses: {
                '200': {
                  description: 'API is healthy',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          status: { type: 'string', example: 'ok' },
                          timestamp: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        note: `Complete API documentation is available at: ${url}`,
      };

      return {
        contents: [
          {
            uri,
            mimeType,
            text: JSON.stringify(swaggerPlaceholder, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error fetching Swagger resource', { 
        uri, 
        url, 
        err: error 
      });
      
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Error fetching Swagger documentation from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
  /**
   * Handle get_api_health tool call using the HealthService.
   * @private
   */
  private handleGetApiHealth(): { content: Array<{ type: string; text: string }> } {
    const healthStatus = this.healthService.getHealthStatus();

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