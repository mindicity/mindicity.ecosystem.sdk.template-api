import { createServer, Server as HttpServer } from 'http';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { HealthMcpHttpTool } from '../../../modules/health/mcp';

import { McpTransport, TransportConfig } from './base-transport';
import { OptionalTransportDependencies } from './transport-dependencies';

/**
 * HTTP transport implementation for MCP server.
 * Provides HTTP endpoint for MCP communication with AI agents.
 */
export class HttpTransport implements McpTransport {
  private httpServer: HttpServer | null = null;
  private mcpServer: Server | null = null;
  private healthMcpTool: HealthMcpHttpTool;

  constructor(
    private readonly config: TransportConfig,
    private readonly dependencies: OptionalTransportDependencies,
  ) {
    // Validate that required dependencies are present
    if (!dependencies.healthService) {
      throw new Error('HttpTransport requires HealthService in dependencies');
    }

    // Initialize MCP tools
    this.healthMcpTool = new HealthMcpHttpTool(dependencies.healthService);
  }

  /**
   * Connect the HTTP transport to the MCP server.
   * Creates an HTTP server listening on the configured host and port.
   * 
   * @param server - MCP server instance to connect to
   * @returns Promise that resolves when HTTP server is listening
   */
  connect(server: Server): Promise<void> {
    this.mcpServer = server;
    
    this.httpServer = createServer((req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', (): void => {
        (async (): Promise<void> => {
          try {
            const request = JSON.parse(body);
            
            // Create a mock transport for handling the request
            const mockTransport = {
              send: (response: unknown): void => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
              },
              close: (): void => {
                // No-op for HTTP
              },
            };

            // Handle the MCP request
            await this.handleMcpRequest(request, mockTransport);
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: 'Invalid JSON request',
              details: error instanceof Error ? error.message : 'Unknown error'
            }));
          }
        })().catch((error) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
          }));
        });
      });
    });

    return new Promise<void>((resolve, reject) => {
      this.httpServer!.listen(this.config.port, this.config.host, () => {
        resolve();
      });

      this.httpServer!.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Disconnect the HTTP transport and cleanup resources.
   * Closes the HTTP server and cleans up connections.
   * 
   * @returns Promise that resolves when server is closed
   */
  disconnect(): Promise<void> {
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer!.close(() => {
          this.httpServer = null;
          resolve();
        });
      });
    }
    return Promise.resolve();
  }

  /**
   * Get transport information and configuration details.
   * 
   * @returns Transport type, host, port, and endpoint information
   */
  getTransportInfo(): { type: string; details: Record<string, unknown> } {
    return {
      type: 'http',
      details: {
        host: this.config.host,
        port: this.config.port,
        serverName: this.config.serverName,
        version: this.config.serverVersion,
        endpoint: `http://${this.config.host}:${this.config.port}/mcp`,
      },
    };
  }

  /**
   * Fetch the OpenAPI specification resource.
   * @private
   */
  private async fetchOpenApiResource(uri: string, id: unknown, transport: { send: (response: unknown) => void }): Promise<void> {
    try {
      // Try to read the exported OpenAPI JSON file first
      const fs = await import('fs');
      const path = await import('path');
      
      const openApiPath = path.join(process.cwd(), 'docs', 'api', 'openapi.json');
      
      if (fs.existsSync(openApiPath)) {
        const openApiContent = fs.readFileSync(openApiPath, 'utf8');
        
        transport.send({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: openApiContent,
              },
            ],
          },
        });
        return;
      }
      
      // Fallback: generate a minimal spec if file doesn't exist
      const apiPrefix = this.dependencies.appConfig?.apiPrefix ?? '/mcapi';
      const swaggerHostname = this.dependencies.appConfig?.swaggerHostname ?? 'http://localhost:3232';
      
      const swaggerUiUrl = `${swaggerHostname}${apiPrefix}/docs/swagger/ui`;
      
      const minimalSpec = {
        openapi: '3.0.0',
        info: {
          title: this.config.serverName,
          version: this.config.serverVersion,
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
        note: `Complete API documentation with all endpoints is available at: ${swaggerUiUrl}`,
      };

      transport.send({
        jsonrpc: '2.0',
        id,
        result: {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(minimalSpec, null, 2),
            },
          ],
        },
      });
    } catch (error) {
      transport.send({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Error fetching OpenAPI specification',
          data: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Handle MCP request through HTTP.
   * @private
   */
  private async handleMcpRequest(request: unknown, transport: { send: (response: unknown) => void }): Promise<void> {
    if (!this.mcpServer) {
      throw new Error('MCP server not initialized');
    }

    try {
      const req = request as { method?: string; params?: unknown; id?: unknown };
      
      switch (req.method) {
        case 'initialize':
          this.handleInitialize(req, transport);
          break;
        case 'tools/list':
          this.handleToolsList(req, transport);
          break;
        case 'tools/call':
          this.handleToolsCall(req, transport);
          break;
        case 'resources/list':
          this.handleResourcesList(req, transport);
          break;
        case 'resources/read':
          await this.handleResourcesRead(req, transport);
          break;
        default:
          this.handleUnknownMethod(req, transport);
      }
    } catch (error) {
      this.handleError(request, transport, error);
    }
  }

  /**
   * Handle initialize request.
   * @private
   */
  private handleInitialize(req: { id?: unknown }, transport: { send: (response: unknown) => void }): void {
    transport.send({
      jsonrpc: '2.0',
      id: req.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: {
          name: this.config.serverName,
          version: this.config.serverVersion,
        },
      },
    });
  }

  /**
   * Handle tools/list request.
   * @private
   */
  private handleToolsList(req: { id?: unknown }, transport: { send: (response: unknown) => void }): void {
    transport.send({
      jsonrpc: '2.0',
      id: req.id,
      result: {
        tools: HealthMcpHttpTool.getToolDefinitions(),
      },
    });
  }

  /**
   * Handle tools/call request.
   * @private
   */
  private handleToolsCall(req: { id?: unknown; params?: unknown }, transport: { send: (response: unknown) => void }): void {
    const params = req.params as { name?: string; arguments?: unknown };
    const toolName = params?.name;
    const toolArgs = (params?.arguments as Record<string, unknown>) ?? {};
    
    try {
      if (toolName === 'get_api_health') {
        const result = this.healthMcpTool.getApiHealth(toolArgs);

        transport.send({
          jsonrpc: '2.0',
          id: req.id,
          result,
        });
      } else {
        transport.send({
          jsonrpc: '2.0',
          id: req.id,
          error: {
            code: -32601,
            message: `Unknown tool: ${toolName}`,
          },
        });
      }
    } catch (error) {
      transport.send({
        jsonrpc: '2.0',
        id: req.id,
        error: {
          code: -32603,
          message: 'Tool execution failed',
          data: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Handle resources/list request.
   * @private
   */
  private handleResourcesList(req: { id?: unknown }, transport: { send: (response: unknown) => void }): void {
    transport.send({
      jsonrpc: '2.0',
      id: req.id,
      result: {
        resources: [
          {
            uri: 'doc://openapi',
            name: 'API OpenAPI Specification',
            description: 'Complete OpenAPI/Swagger specification for the API endpoints',
            mimeType: 'application/json',
          },
        ],
      },
    });
  }

  /**
   * Handle resources/read request.
   * @private
   */
  private async handleResourcesRead(req: { id?: unknown; params?: unknown }, transport: { send: (response: unknown) => void }): Promise<void> {
    const params = req.params as { uri?: string };
    const uri = params?.uri;
    
    switch (uri) {
      case 'doc://openapi':
        await this.fetchOpenApiResource(uri, req.id, transport);
        break;
      default:
        transport.send({
          jsonrpc: '2.0',
          id: req.id,
          error: {
            code: -32601,
            message: `Unknown resource URI: ${uri}`,
            data: {
              supportedSchemes: ['doc://'],
              availableResources: ['doc://openapi'],
            },
          },
        });
    }
  }

  /**
   * Handle unknown method request.
   * @private
   */
  private handleUnknownMethod(req: { method?: string; id?: unknown }, transport: { send: (response: unknown) => void }): void {
    transport.send({
      jsonrpc: '2.0',
      id: req.id,
      error: {
        code: -32601,
        message: `Method not implemented in HTTP transport: ${req.method}`,
      },
    });
  }

  /**
   * Handle error in request processing.
   * @private
   */
  private handleError(request: unknown, transport: { send: (response: unknown) => void }, error: unknown): void {
    transport.send({
      jsonrpc: '2.0',
      id: request && typeof request === 'object' ? (request as { id?: unknown }).id : undefined,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}