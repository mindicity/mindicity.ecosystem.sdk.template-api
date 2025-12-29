import { createServer, Server as HttpServer } from 'http';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { McpTransport, TransportConfig } from './base-transport';
import { OptionalTransportDependencies } from './transport-dependencies';

// Forward declaration to avoid circular dependency
interface IMcpServerService {
  getAvailableTools(): Array<{
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
  }>;
  executeToolCall(toolName: string, args: unknown): CallToolResult;
  getAvailableResources(): Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }>;
  readResource(uri: string): {
    contents: Array<{ uri: string; mimeType: string; text?: string }>;
  };
}

/**
 * HTTP transport implementation for MCP server.
 * Provides HTTP endpoint for MCP communication with AI agents.
 * Delegates all MCP operations to the McpServerService for dynamic tool handling.
 */
export class HttpTransport implements McpTransport {
  private httpServer: HttpServer | null = null;
  private mcpServer: Server | null = null;
  private mcpServerService: IMcpServerService | null = null;

  constructor(
    private readonly config: TransportConfig,
    private readonly dependencies: OptionalTransportDependencies,
  ) {
    // Dependencies are optional for HTTP transport since it delegates to McpServerService
  }

  /**
   * Set the MCP server service for dynamic tool handling.
   * This is called by McpServerService after it's fully initialized.
   */
  public setMcpServerService(mcpServerService: IMcpServerService): void {
    this.mcpServerService = mcpServerService;
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
   * Handle MCP request through HTTP by delegating to McpServerService.
   * All tool and resource operations are handled dynamically by the MCP server service.
   * @private
   */
  private async handleMcpRequest(request: unknown, transport: { send: (response: unknown) => void }): Promise<void> {
    try {
      const req = request as { method?: string; params?: unknown; id?: unknown; jsonrpc?: string };
      
      switch (req.method) {
        case 'initialize':
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
          break;
          
        case 'tools/list':
          if (!this.mcpServerService) {
            transport.send({
              jsonrpc: '2.0',
              id: req.id,
              error: {
                code: -32603,
                message: 'MCP server service not initialized',
              },
            });
            return;
          }
          
          try {
            const tools = this.mcpServerService.getAvailableTools();
            transport.send({
              jsonrpc: '2.0',
              id: req.id,
              result: { tools },
            });
          } catch (error) {
            transport.send({
              jsonrpc: '2.0',
              id: req.id,
              error: {
                code: -32603,
                message: 'Error listing tools',
                data: error instanceof Error ? error.message : 'Unknown error',
              },
            });
          }
          break;
          
        case 'tools/call':
          if (!this.mcpServerService) {
            transport.send({
              jsonrpc: '2.0',
              id: req.id,
              error: {
                code: -32603,
                message: 'MCP server service not initialized',
              },
            });
            return;
          }
          
          try {
            const params = req.params as { name?: string; arguments?: unknown };
            const toolName = params?.name;
            const toolArgs = (params?.arguments as Record<string, unknown>) ?? {};
            
            if (!toolName) {
              transport.send({
                jsonrpc: '2.0',
                id: req.id,
                error: {
                  code: -32602,
                  message: 'Tool name is required',
                },
              });
              return;
            }
            
            const result = this.mcpServerService.executeToolCall(toolName, toolArgs);
            transport.send({
              jsonrpc: '2.0',
              id: req.id,
              result,
            });
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
          break;
          
        case 'resources/list':
          if (!this.mcpServerService) {
            transport.send({
              jsonrpc: '2.0',
              id: req.id,
              error: {
                code: -32603,
                message: 'MCP server service not initialized',
              },
            });
            return;
          }
          
          try {
            const resources = this.mcpServerService.getAvailableResources();
            transport.send({
              jsonrpc: '2.0',
              id: req.id,
              result: { resources },
            });
          } catch (error) {
            transport.send({
              jsonrpc: '2.0',
              id: req.id,
              error: {
                code: -32603,
                message: 'Error listing resources',
                data: error instanceof Error ? error.message : 'Unknown error',
              },
            });
          }
          break;
          
        case 'resources/read':
          if (!this.mcpServerService) {
            transport.send({
              jsonrpc: '2.0',
              id: req.id,
              error: {
                code: -32603,
                message: 'MCP server service not initialized',
              },
            });
            return;
          }
          
          try {
            const params = req.params as { uri?: string };
            const uri = params?.uri;
            
            if (!uri) {
              transport.send({
                jsonrpc: '2.0',
                id: req.id,
                error: {
                  code: -32602,
                  message: 'Resource URI is required',
                },
              });
              return;
            }
            
            const result = this.mcpServerService.readResource(uri);
            transport.send({
              jsonrpc: '2.0',
              id: req.id,
              result,
            });
          } catch (error) {
            transport.send({
              jsonrpc: '2.0',
              id: req.id,
              error: {
                code: -32603,
                message: 'Error reading resource',
                data: error instanceof Error ? error.message : 'Unknown error',
              },
            });
          }
          break;
          
        default:
          transport.send({
            jsonrpc: '2.0',
            id: req.id,
            error: {
              code: -32601,
              message: `Method not implemented: ${req.method}`,
            },
          });
      }
    } catch (error) {
      this.handleError(request, transport, error);
    }
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