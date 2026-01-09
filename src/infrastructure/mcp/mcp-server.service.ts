import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolResult , 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';


import { ContextLoggerService } from '../../common/services/context-logger.service';
import { McpConfig } from '../../config/mcp.config';
import { ROUTES } from '../../config/routes.config';
import { HealthService } from '../../modules/health/health.service';
import { HealthMcpHttpTool, HealthMcpResources } from '../../modules/health/mcp';

import { McpTransport } from './transports/base-transport';
import { HttpTransport } from './transports/http-transport';
import { createTransportDependencies } from './transports/transport-dependencies';
import { TransportFactory } from './transports/transport-factory';

/**
 * MCP Server Service provides Model Context Protocol server functionality.
 * 
 * MCP (Model Context Protocol) is a standardized protocol that allows AI agents
 * to interact with external systems through structured tools and resources.
 * 
 * This service creates an MCP server that exposes the API functionality to AI agents,
 * enabling them to:
 * 
 * **TOOLS** - Execute specific API operations:
 * - Call API endpoints with proper parameters
 * - Perform CRUD operations on data
 * - Execute business logic through service methods
 * - Get real-time data and status information
 * 
 * **RESOURCES** - Access API documentation and specifications:
 * - Read OpenAPI/Swagger specifications
 * - Understand API structure and capabilities
 * - Get schema definitions and examples
 * - Access endpoint documentation
 * 
 * **TRANSPORTS** - Multiple connection methods:
 * - HTTP: RESTful API calls over HTTP
 * - SSE: Server-Sent Events for real-time communication
 * - STDIO: Standard input/output for command-line integration
 * 
 * The MCP server automatically:
 * - Discovers available API endpoints and converts them to tools
 * - Generates comprehensive tool descriptions for AI agents
 * - Provides access to API documentation as resources
 * - Handles authentication and error management
 * - Logs all interactions for monitoring and debugging
 * 
 * AI agents can use this MCP server to:
 * - Understand what the API can do by reading resources
 * - Execute API operations by calling tools
 * - Get real-time data and perform automated tasks
 * - Integrate the API into larger workflows and processes
 * 
 * @example
 * ```typescript
 * // The MCP server automatically starts when the module initializes
 * // AI agents can then connect and use tools like:
 * // - get_api_health: Check server status
 * // - get_users_list: Retrieve user data
 * // - create_user: Add new users
 * // And access resources like:
 * // - swagger://api-docs/swagger/specs: Complete API documentation
 * ```
 */
@Injectable()
export class McpServerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: ContextLoggerService;
  private server: Server | null = null;
  private transport: McpTransport | null = null;
  private readonly mcpConfig: McpConfig;
  private healthMcpHttpTool: HealthMcpHttpTool;
  // Future MCP tools can be added here:
  // private userMcpHttpTool: UserMcpHttpTool;
  // private notificationMcpHttpTool: NotificationMcpHttpTool;

  constructor(
    private readonly configService: ConfigService,
    private readonly healthService: HealthService,
    loggerService: ContextLoggerService,
  ) {
    this.logger = loggerService.child({ serviceContext: McpServerService.name });
    this.logger.setContext(McpServerService.name);
    this.mcpConfig = this.configService.get<McpConfig>('mcp')!;
    
    // Initialize MCP tools
    this.healthMcpHttpTool = new HealthMcpHttpTool(this.healthService, loggerService);
    
    // Future MCP tools initialization:
    // this.userMcpHttpTool = new UserMcpHttpTool(this.userService);
    // this.notificationMcpHttpTool = new NotificationMcpHttpTool(this.notificationService);
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
    const appConfig = this.configService.get('app');
    const dependencies = createTransportDependencies({
      healthService: this.healthService,
      loggerService: this.logger,
      appConfig,
      configService: this.configService,
      // Future services can be added here without breaking existing code:
      // userService: this.userService,
      // notificationService: this.notificationService,
      // analyticsService: this.analyticsService,
      // databaseService: this.databaseService,
    });

    // Build MCP base path using routes configuration
    const apiPrefix = appConfig?.apiPrefix ?? '/mcapi';
    const mcpBasePath = `${apiPrefix}/${ROUTES.MCP}`;

    this.transport = TransportFactory.createTransport({
      transport: this.mcpConfig.transport,
      port: this.mcpConfig.port,
      host: this.mcpConfig.host,
      serverName: this.mcpConfig.serverName,
      serverVersion: this.mcpConfig.serverVersion,
      basePath: mcpBasePath,
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

    // If using HTTP transport, set the MCP server service reference for dynamic delegation
    if (this.mcpConfig.transport === 'http' && 'setMcpServerService' in this.transport) {
      (this.transport as HttpTransport).setMcpServerService(this);
    }

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
   * 
   * This method configures the MCP server to handle four types of requests:
   * 
   * 1. **ListTools** - Returns all available tools (API endpoints) that AI agents can call
   * 2. **CallTool** - Executes a specific tool (API endpoint) with provided parameters
   * 3. **ListResources** - Returns all available resources (API documentation) that agents can read
   * 4. **ReadResource** - Fetches the content of a specific resource (documentation file)
   * 
   * Each tool corresponds to an API endpoint and provides:
   * - Clear description of what the tool does
   * - Input schema defining required and optional parameters
   * - Proper error handling and response formatting
   * - Integration with existing service methods
   * 
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
    this.server.setRequestHandler(CallToolRequestSchema, (request) => {
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
    this.server.setRequestHandler(ReadResourceRequestSchema, (request) => {
      const { uri } = request.params;
      
      this.logger.trace('MCP resource read requested', { uri });

      return this.handleDynamicResourceRead(uri);
    });

    this.logger.debug('Dynamic MCP tool and resource handlers configured');
  }

  /**
   * Generate dynamic tools by collecting tool definitions from MCP modules.
   * Each tool represents a specific API operation that AI agents can perform.
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
    const tools = [];
    
    // Get tool definitions from health module (HTTP transport only)
    tools.push(...HealthMcpHttpTool.getToolDefinitions());

    // Future modules can be added here:
    // tools.push(...UserMcpTool.getToolDefinitions());
    // tools.push(...NotificationMcpTool.getToolDefinitions());
    // tools.push(...AnalyticsMcpTool.getToolDefinitions());
    
    return tools;
  }

  /**
   * Handle dynamic tool calls by delegating to appropriate MCP tools.
   * Routes tool calls to the correct module based on tool name patterns.
   * @private
   */
  private handleDynamicToolCall(toolName: string, args: unknown): CallToolResult {
    // Health module tools
    if (toolName.startsWith('get_api_health')) {
      return this.healthMcpHttpTool.getApiHealth(args as Record<string, unknown>);
    }
    
    // Future module tools can be added here:
    // User module tools
    // if (toolName.startsWith('get_users_') || toolName.startsWith('create_user') || 
    //     toolName.startsWith('update_user') || toolName.startsWith('delete_user')) {
    //   return this.userMcpHttpTool.handleToolCall(toolName, args as Record<string, unknown>);
    // }
    
    // Notification module tools
    // if (toolName.startsWith('send_notification') || toolName.startsWith('get_notifications_')) {
    //   return this.notificationMcpHttpTool.handleToolCall(toolName, args as Record<string, unknown>);
    // }
    
    // Analytics module tools
    // if (toolName.startsWith('get_analytics_') || toolName.startsWith('track_event')) {
    //   return this.analyticsMcpHttpTool.handleToolCall(toolName, args as Record<string, unknown>);
    // }
    
    throw new Error(`Unknown tool: ${toolName}`);
  }

  /**
   * Generate dynamic resources by collecting resource definitions from all MCP modules.
   * Resources provide AI agents with access to API specifications and documentation.
   * @private
   */
  private generateDynamicResources(): Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }> {
    const resources = [];
    
    // Get resource definitions from health module
    resources.push(...HealthMcpResources.getResourceDefinitions(this.configService));
    
    // Future modules can be added here:
    // resources.push(...UserMcpResources.getResourceDefinitions(this.configService));
    // resources.push(...NotificationMcpResources.getResourceDefinitions(this.configService));
    // resources.push(...AnalyticsMcpResources.getResourceDefinitions(this.configService));
    
    return resources;
  }

  /**
   * Handle dynamic resource reads by delegating to appropriate module resources.
   * Routes resource requests to the correct module based on URI patterns.
   * @private
   */
  private handleDynamicResourceRead(uri: string): {
    contents: Array<{ uri: string; mimeType: string; text?: string }>;
  } {
    try {
      // Route to appropriate module based on URI patterns
      
      // Health module resources (openapi specs, health docs)
      if (uri.startsWith('doc://openapi') && uri.includes('/specs')) {
        const healthResources = new HealthMcpResources(this.configService, this.logger);
        return healthResources.handleResourceRead(uri);
      }
      
      // Future module resources can be added here:
      // User module resources
      // if (uri.startsWith('user://') || uri.includes('/user/')) {
      //   const userResources = new UserMcpResources(this.configService);
      //   return await userResources.handleResourceRead(uri);
      // }
      
      // Notification module resources
      // if (uri.startsWith('notification://') || uri.includes('/notification/')) {
      //   const notificationResources = new NotificationMcpResources(this.configService);
      //   return await notificationResources.handleResourceRead(uri);
      // }
      
      // Analytics module resources
      // if (uri.startsWith('analytics://') || uri.includes('/analytics/')) {
      //   const analyticsResources = new AnalyticsMcpResources(this.configService);
      //   return await analyticsResources.handleResourceRead(uri);
      // }
      
      // If no module matches, return error
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
   * Get all available MCP tools dynamically.
   * This method is used by HTTP transport to provide tool listings.
   * @public
   */
  public getAvailableTools(): Array<{
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
  }> {
    return this.generateDynamicTools();
  }

  /**
   * Execute a tool call dynamically.
   * This method is used by HTTP transport to execute tool calls.
   * @public
   */
  public executeToolCall(toolName: string, args: unknown): CallToolResult {
    return this.handleDynamicToolCall(toolName, args);
  }

  /**
   * Get all available MCP resources dynamically.
   * This method is used by HTTP transport to provide resource listings.
   * @public
   */
  public getAvailableResources(): Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }> {
    return this.generateDynamicResources();
  }

  /**
   * Read a resource dynamically.
   * This method is used by HTTP transport to read resource content.
   * @public
   */
  public readResource(uri: string): {
    contents: Array<{ uri: string; mimeType: string; text?: string }>;
  } {
    return this.handleDynamicResourceRead(uri);
  }
}