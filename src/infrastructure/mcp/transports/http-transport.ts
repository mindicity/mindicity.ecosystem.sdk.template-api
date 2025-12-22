import { createServer, Server as HttpServer } from 'http';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { McpTransport, TransportConfig } from './base-transport';
import { OptionalTransportDependencies } from './transport-dependencies';

/**
 * HTTP transport implementation for MCP server.
 * Provides HTTP endpoint for MCP communication with AI agents.
 */
export class HttpTransport implements McpTransport {
  private httpServer: HttpServer | null = null;
  private mcpServer: Server | null = null;

  constructor(
    private readonly config: TransportConfig,
    private readonly dependencies: OptionalTransportDependencies,
  ) {
    // Validate that required dependencies are present
    if (!dependencies.healthService) {
      throw new Error('HttpTransport requires HealthService in dependencies');
    }
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

      req.on('end', async (): Promise<void> => {
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
   * Fetch the real Swagger resource content from the generated OpenAPI document.
   * @private
   */
  private async fetchRealSwaggerResource(uri: string, transport: { send: (response: unknown) => void }): Promise<void> {
    try {
      // Try to read the exported OpenAPI JSON file first
      const fs = await import('fs');
      const path = await import('path');
      
      const openApiPath = path.join(process.cwd(), 'docs', 'api', 'openapi.json');
      
      if (fs.existsSync(openApiPath)) {
        const swaggerContent = fs.readFileSync(openApiPath, 'utf8');
        
        transport.send({
          jsonrpc: '2.0',
          id: undefined, // Will be set by caller
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: swaggerContent,
              },
            ],
          },
        });
        return;
      }
      
      // Fallback: generate a minimal spec if file doesn't exist
      const minimalSpec = {
        openapi: '3.0.0',
        info: {
          title: this.config.serverName,
          version: this.config.serverVersion,
          description: 'API specification - full documentation available via Swagger UI',
        },
        servers: [
          {
            url: 'http://localhost:3232/mcapi',
            description: 'API Server',
          },
        ],
        paths: {},
        components: {},
        note: 'Complete API documentation with all endpoints is available at: http://localhost:3232/mcapi/docs/project/swagger/ui',
      };

      transport.send({
        jsonrpc: '2.0',
        id: undefined, // Will be set by caller
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
        id: undefined, // Will be set by caller
        error: {
          code: -32603,
          message: 'Error fetching Swagger documentation',
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
      
      if (req.method === 'initialize') {
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
      } else if (req.method === 'tools/list') {
        // Handle tools/list request - only health endpoint
        transport.send({
          jsonrpc: '2.0',
          id: req.id,
          result: {
            tools: [
              {
                name: 'get_api_health',
                description: 'Check the health status of the API server',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  required: [],
                },
              },
            ],
          },
        });
      } else if (req.method === 'tools/call') {
        // Handle tools/call request - only health endpoint
        const params = req.params as { name?: string; arguments?: unknown };
        const toolName = params?.name;
        
        if (toolName === 'get_api_health') {
          const healthData = this.dependencies.healthService!.getHealthStatus();

          transport.send({
            jsonrpc: '2.0',
            id: req.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(healthData, null, 2),
                },
              ],
            },
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
      } else if (req.method === 'resources/list') {
        // Handle resources/list request - only specs, no UI
        transport.send({
          jsonrpc: '2.0',
          id: req.id,
          result: {
            resources: [
              {
                uri: 'swagger://docs/project/swagger/specs',
                name: 'API Swagger Specification',
                description: 'Complete OpenAPI/Swagger specification for the API endpoints',
                mimeType: 'application/json',
              },
            ],
          },
        });
      } else if (req.method === 'resources/read') {
        // Handle resources/read request
        const params = req.params as { uri?: string };
        const uri = params?.uri;
        
        if (uri?.startsWith('swagger://docs') && uri.includes('/swagger/specs')) {
          // Read the real Swagger JSON specification from the generated document
          await this.fetchRealSwaggerResource(uri, {
            send: (response: unknown) => {
              const resp = response as { result?: unknown; error?: unknown };
              transport.send({
                jsonrpc: '2.0',
                id: req.id,
                ...resp,
              });
            },
          });
        } else {
          transport.send({
            jsonrpc: '2.0',
            id: req.id,
            error: {
              code: -32601,
              message: `Unknown resource URI: ${uri}`,
            },
          });
        }
      } else {
        // For other requests, return a not implemented response
        transport.send({
          jsonrpc: '2.0',
          id: req.id,
          error: {
            code: -32601,
            message: `Method not implemented in HTTP transport: ${req.method}`,
          },
        });
      }
    } catch (error) {
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
}