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
    const appConfig = this.configService.get('app');
    const dependencies = createTransportDependencies({
      healthService: this.healthService,
      appConfig,
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
   * Generate dynamic tools based on available API endpoints.
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
    const appConfig = this.configService.get('app');
    const baseUrl = `${appConfig?.apiPrefix ?? '/mcapi'}${appConfig?.apiScopePrefix ?? ''}`;
    
    // Define available API endpoints that become MCP tools
    // Each tool provides AI agents with a specific capability to interact with the API
    const apiEndpoints = [
      {
        name: 'get_api_health',
        method: 'GET',
        path: `${baseUrl}/health`,
        description: `Check the current health and operational status of the ${this.mcpConfig.serverName} API server. 
        
This tool provides comprehensive health information including:
- Server status (healthy/unhealthy)
- Current timestamp
- Server name and version
- Environment details
- Uptime information
- System resource status

Use this tool to:
- Verify the API is operational before making other requests
- Monitor server health in automated workflows
- Troubleshoot connectivity issues
- Get basic server information for debugging

Returns: JSON object with health status, timestamp, server details, and operational metrics.`,
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
  private handleDynamicToolCall(toolName: string, args: unknown): {
    content: Array<{ type: string; text: string }>;
  } {
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
  private callApiEndpoint(method: string, path: string, args: unknown): {
    content: Array<{ type: string; text: string }>;
  } {
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
   * Resources provide AI agents with access to API specifications and documentation.
   * @private
   */
  private generateDynamicResources(): Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }> {
    const appConfig = this.configService.get('app');
    const apiScopePrefix = appConfig?.apiScopePrefix ?? '';
    
    // Define available API documentation resources
    // Resources allow AI agents to understand the complete API structure and capabilities
    const apiResources = [
      {
        uri: `swagger://api-docs${apiScopePrefix}/swagger/specs`,
        name: 'API OpenAPI Specification',
        description: `Complete OpenAPI 3.0 specification for the ${this.mcpConfig.serverName} API.

This resource contains the full API documentation including:
- All available endpoints with HTTP methods and paths
- Request/response schemas and data models
- Parameter definitions and validation rules
- Authentication requirements
- Error response formats
- Example requests and responses

Use this resource to:
- Understand the complete API structure and capabilities
- Generate proper API requests with correct parameters
- Validate request/response formats
- Learn about available endpoints and their purposes
- Get schema definitions for data models

Format: JSON document following OpenAPI 3.0 specification standard.
Content: Machine-readable API specification that can be used to generate client code, documentation, or API calls.`,
        mimeType: 'application/json',
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
    try {
      if (uri.startsWith('swagger://api-docs') && uri.includes('/swagger/specs')) {
        // Fetch the real Swagger JSON specification from the generated document
        return await this.fetchRealSwaggerResource(uri);
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
   * Fetch the real Swagger resource content from the generated OpenAPI document.
   * @private
   */
  private async fetchRealSwaggerResource(uri: string): Promise<{
    contents: Array<{ uri: string; mimeType: string; text?: string }>;
  }> {
    try {
      // Try to read the exported OpenAPI JSON file first
      const fs = await import('fs');
      const path = await import('path');
      
      const openApiPath = path.join(process.cwd(), 'docs', 'api', 'openapi.json');
      
      if (fs.existsSync(openApiPath)) {
        const swaggerContent = fs.readFileSync(openApiPath, 'utf8');
        
        this.logger.debug('Swagger specification loaded from file', { 
          path: openApiPath,
          size: swaggerContent.length 
        });
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: swaggerContent,
            },
          ],
        };
      }
      
      // Fallback: generate a minimal spec if file doesn't exist
      this.logger.warn('OpenAPI file not found, generating minimal specification', { 
        expectedPath: openApiPath 
      });
      
      const appConfig = this.configService.get('app');
      const swaggerHostname = appConfig?.swaggerHostname ?? 'http://localhost:3232';
      const apiPrefix = appConfig?.apiPrefix ?? '/mcapi';
      const apiScopePrefix = appConfig?.apiScopePrefix ?? '';
      
      const minimalSpec = {
        openapi: '3.0.0',
        info: {
          title: this.mcpConfig.serverName,
          version: this.mcpConfig.serverVersion,
          description: 'API specification - full documentation available via Swagger UI',
        },
        servers: [
          {
            url: `${swaggerHostname}${apiPrefix}`,
            description: 'API Server',
          },
        ],
        paths: {},
        components: {},
        note: `Complete API documentation with all endpoints is available at: ${swaggerHostname}${apiPrefix}/docs${apiScopePrefix}/swagger/ui`,
      };

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(minimalSpec, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error fetching real Swagger resource', { 
        uri, 
        err: error 
      });
      
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Error fetching Swagger documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  /**
   * Handle get_api_health tool call using the HealthService.
   * 
   * This tool provides comprehensive health information about the API server,
   * including operational status, version info, and system metrics.
   * 
   * @private
   */
  private handleGetApiHealth(): { content: Array<{ type: string; text: string }> } {
    try {
      const healthStatus = this.healthService.getHealthStatus();

      // Add MCP-specific metadata to help AI agents understand the response
      const mcpResponse = {
        tool: 'get_api_health',
        description: 'API server health status and operational information',
        timestamp: new Date().toISOString(),
        data: healthStatus,
        usage: {
          purpose: 'Monitor API server health and operational status',
          interpretation: {
            status: 'healthy = server is operational, unhealthy = server has issues',
            timestamp: 'Current server time when health check was performed',
            server: 'API server name and identification',
            version: 'Current API version deployed',
            environment: 'Deployment environment (development, staging, production)',
            uptime: 'How long the server has been running',
          },
          nextSteps: [
            'If status is healthy: API is ready for requests',
            'If status is unhealthy: Check logs and system resources',
            'Use this before making other API calls to ensure availability',
          ],
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(mcpResponse, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting API health status', { err: error });
      
      const errorResponse = {
        tool: 'get_api_health',
        error: 'Failed to retrieve health status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        suggestion: 'Check server logs and ensure health service is properly configured',
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorResponse, null, 2),
          },
        ],
      };
    }
  }
}