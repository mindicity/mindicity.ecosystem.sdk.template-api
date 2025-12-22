import { createServer, Server as HttpServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { McpTransport, TransportConfig } from './base-transport';
import { OptionalTransportDependencies } from './transport-dependencies';

/**
 * Server-Sent Events transport implementation for MCP server.
 * Provides SSE endpoint for real-time MCP communication with AI agents.
 */
export class SseTransport implements McpTransport {
  private httpServer: HttpServer | null = null;
  private mcpServer: Server | null = null;
  private clients: Set<ServerResponse> = new Set();

  constructor(
    private readonly config: TransportConfig,
    private readonly dependencies: OptionalTransportDependencies,
  ) {
    // Validate that required dependencies are present
    if (!dependencies.healthService) {
      throw new Error('SseTransport requires HealthService in dependencies');
    }
  }

  /**
   * Connect the SSE transport to the MCP server.
   * Creates an HTTP server with SSE endpoints for real-time communication.
   * 
   * @param server - MCP server instance to connect to
   * @returns Promise that resolves when HTTP server is listening
   */
  connect(server: Server): Promise<void> {
    this.mcpServer = server;
    
    this.httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url ?? '', true);
      
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (parsedUrl.pathname === '/mcp/events') {
        this.handleSseConnection(req, res);
      } else if (parsedUrl.pathname === '/mcp' && req.method === 'POST') {
        this.handleMcpRequest(req, res);
      } else if (parsedUrl.pathname === '/mcp/info' && req.method === 'GET') {
        this.handleInfoRequest(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
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
   * Disconnect the SSE transport and cleanup resources.
   * Closes all SSE connections and the HTTP server.
   * 
   * @returns Promise that resolves when server is closed
   */
  disconnect(): Promise<void> {
    // Close all SSE connections
    for (const client of this.clients) {
      client.end();
    }
    this.clients.clear();

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
   * @returns Transport type, endpoints, and active connection information
   */
  getTransportInfo(): { type: string; details: Record<string, unknown> } {
    return {
      type: 'sse',
      details: {
        host: this.config.host,
        port: this.config.port,
        serverName: this.config.serverName,
        version: this.config.serverVersion,
        eventsEndpoint: `http://${this.config.host}:${this.config.port}/mcp/events`,
        requestEndpoint: `http://${this.config.host}:${this.config.port}/mcp`,
        infoEndpoint: `http://${this.config.host}:${this.config.port}/mcp/info`,
        activeConnections: this.clients.size,
      },
    };
  }

  /**
   * Handle SSE connection for real-time events.
   * @private
   */
  private handleSseConnection(req: IncomingMessage, res: ServerResponse): void {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Add client to active connections
    this.clients.add(res);

    // Send initial connection event
    this.sendSseEvent(res, 'connected', {
      serverName: this.config.serverName,
      version: this.config.serverVersion,
      timestamp: new Date().toISOString(),
    });

    // Handle client disconnect
    req.on('close', () => {
      this.clients.delete(res);
    });

    req.on('error', () => {
      this.clients.delete(res);
    });
  }

  /**
   * Handle MCP request via POST.
   * @private
   */
  private handleMcpRequest(req: IncomingMessage, res: ServerResponse): void {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', (): void => {
      (async (): Promise<void> => {
        try {
          const request = JSON.parse(body);
          const response = await this.processMcpRequest(request);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));

          // Broadcast the request/response to SSE clients
          this.broadcastToClients('mcp-request', {
            request,
            response,
            timestamp: new Date().toISOString(),
          });
        } catch (_error) {
          const errorResponse = {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: 'Parse error',
              data: _error instanceof Error ? _error.message : 'Unknown error',
            },
          };

          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(errorResponse));
        }
      })().catch((error) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }));
      });
    });
  }

  /**
   * Handle info request.
   * @private
   */
  private handleInfoRequest(res: ServerResponse): void {
    const info = {
      serverName: this.config.serverName,
      version: this.config.serverVersion,
      transport: 'sse',
      endpoints: {
        events: `/mcp/events`,
        requests: `/mcp`,
        info: `/mcp/info`,
      },
      activeConnections: this.clients.size,
      capabilities: {
        tools: {},
        resources: {},
      },
      availableTools: [
        {
          name: 'get_api_health',
          description: 'Check the health status of the API server',
        },
      ],
      availableResources: [
        {
          uri: 'swagger://docs/project/swagger/specs',
          name: 'API Swagger Specification',
          description: 'Complete OpenAPI/Swagger specification for the API endpoints',
        },
      ],
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(info));
  }

  /**
   * Fetch the real Swagger resource content from the generated OpenAPI document.
   * @private
   */
  private async fetchRealSwaggerResource(uri: string): Promise<{ result?: unknown; error?: unknown }> {
    try {
      // Try to read the exported OpenAPI JSON file first
      const fs = await import('fs');
      const path = await import('path');
      
      const openApiPath = path.join(process.cwd(), 'docs', 'api', 'openapi.json');
      
      if (fs.existsSync(openApiPath)) {
        const swaggerContent = fs.readFileSync(openApiPath, 'utf8');
        
        return {
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: swaggerContent,
              },
            ],
          },
        };
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

      return {
        result: {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(minimalSpec, null, 2),
            },
          ],
        },
      };
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: 'Error fetching Swagger documentation',
          data: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Process MCP request and return response.
   * @private
   */
  private async processMcpRequest(request: unknown): Promise<unknown> {
    const req = request as { method?: string; id?: unknown; params?: unknown };
    
    switch (req.method) {
      case 'initialize':
        return this.processInitialize(req);
      case 'tools/list':
        return this.processToolsList(req);
      case 'tools/call':
        return this.processToolsCall(req);
      case 'resources/list':
        return this.processResourcesList(req);
      case 'resources/read':
        return await this.processResourcesRead(req);
      default:
        return this.processUnknownMethod(req);
    }
  }

  /**
   * Process initialize request.
   * @private
   */
  private processInitialize(req: { id?: unknown }): unknown {
    return {
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
    };
  }

  /**
   * Process tools/list request.
   * @private
   */
  private processToolsList(req: { id?: unknown }): unknown {
    return {
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
    };
  }

  /**
   * Process tools/call request.
   * @private
   */
  private processToolsCall(req: { id?: unknown; params?: unknown }): unknown {
    const params = req.params as { name?: string; arguments?: unknown };
    const toolName = params?.name;
    
    if (toolName === 'get_api_health') {
      const healthData = this.dependencies.healthService!.getHealthStatus();

      return {
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
      };
    } else {
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: {
          code: -32601,
          message: `Unknown tool: ${toolName}`,
        },
      };
    }
  }

  /**
   * Process resources/list request.
   * @private
   */
  private processResourcesList(req: { id?: unknown }): unknown {
    return {
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
    };
  }

  /**
   * Process resources/read request.
   * @private
   */
  private async processResourcesRead(req: { id?: unknown; params?: unknown }): Promise<unknown> {
    const params = req.params as { uri?: string };
    const uri = params?.uri;
    
    if (uri?.startsWith('swagger://docs') && uri.includes('/swagger/specs')) {
      // Read the real Swagger JSON specification from the generated document
      const result = await this.fetchRealSwaggerResource(uri);
      return {
        jsonrpc: '2.0',
        id: req.id,
        ...result,
      };
    } else {
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: {
          code: -32601,
          message: `Unknown resource URI: ${uri}`,
        },
      };
    }
  }

  /**
   * Process unknown method request.
   * @private
   */
  private processUnknownMethod(req: { method?: string; id?: unknown }): unknown {
    return {
      jsonrpc: '2.0',
      id: req.id,
      error: {
        code: -32601,
        message: `Method not implemented in SSE transport: ${req.method}`,
      },
    };
  }

  /**
   * Send SSE event to a specific client.
   * @private
   */
  private sendSseEvent(res: ServerResponse, event: string, data: unknown): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Broadcast event to all connected SSE clients.
   * @private
   */
  private broadcastToClients(event: string, data: unknown): void {
    for (const client of this.clients) {
      try {
        this.sendSseEvent(client, event, data);
      } catch {
        // Remove client if sending fails
        this.clients.delete(client);
      }
    }
  }
}