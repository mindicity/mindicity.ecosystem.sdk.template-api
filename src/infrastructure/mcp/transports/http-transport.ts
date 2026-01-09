import { createServer, Server as HttpServer } from 'http';

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { ContextLoggerService } from '../../../common/services/context-logger.service';

import { McpTransport, TransportConfig } from './base-transport';
import { OptionalTransportDependencies } from './transport-dependencies';

/**
 * Forward declaration to avoid circular dependency.
 * Defines the interface for MCP server service operations.
 */
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
  private static readonly jsonrpcVersion = '2.0';
  
  private httpServer: HttpServer | null = null;
  private mcpServerService: IMcpServerService | null = null;
  private readonly logger: ContextLoggerService;

  constructor(
    private readonly config: TransportConfig,
    dependencies: OptionalTransportDependencies,
  ) {
    // Initialize logger from dependencies - should always be available
    if (dependencies.loggerService) {
      this.logger = dependencies.loggerService.child({ serviceContext: 'HttpTransport' });
      this.logger.setContext('HttpTransport');
    } else {
      // This should not happen in normal operation, but provide a fallback
      throw new Error('ContextLoggerService is required for HttpTransport');
    }
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
  connect(_server: unknown): Promise<void> {
    
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

      // Check if the request path matches the configured MCP base path
      const requestPath = req.url ?? '';
      const expectedPath = this.config.basePath ?? '/mcp';
      
      if (!requestPath.startsWith(expectedPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Not found',
          message: `MCP endpoint available at ${expectedPath}`,
          requestedPath: requestPath
        }));
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
        ((): void => {
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
            this.handleMcpRequest(request, mockTransport);
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: 'Invalid JSON request',
              details: error instanceof Error ? error.message : 'Unknown error'
            }));
          }
        })();
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
    const basePath = this.config.basePath ?? '/mcp';
    return {
      type: 'http',
      details: {
        host: this.config.host,
        port: this.config.port,
        serverName: this.config.serverName,
        version: this.config.serverVersion,
        endpoint: `http://${this.config.host}:${this.config.port}${basePath}`,
      },
    };
  }

  /**
   * Handle MCP request through HTTP by delegating to McpServerService.
   * All tool and resource operations are handled dynamically by the MCP server service.
   * @private
   */
  private handleMcpRequest(request: unknown, transport: { send: (response: unknown) => void }): void {
    try {
      // Validate request is an object
      if (!request || typeof request !== 'object') {
        this.handleError(request, transport, new Error('Invalid request: must be an object'));
        return;
      }

      const req = request as { method?: string; params?: unknown; id?: unknown; jsonrpc?: string };
      
      this.logger.debug('MCP request received', { 
        method: req.method, 
        id: req.id,
        hasParams: !!req.params,
        jsonrpc: req.jsonrpc 
      });
      
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
          this.handleResourcesRead(req, transport);
          break;
        default:
          this.handleUnknownMethod(req, transport);
      }
    } catch (error) {
      this.handleError(request, transport, error);
    }
  }

  /**
   * Handle initialize request
   * @private
   */
  private handleInitialize(req: { id?: unknown }, transport: { send: (response: unknown) => void }): void {
    transport.send({
      jsonrpc: HttpTransport.jsonrpcVersion,
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
   * Handle tools/list request
   * @private
   */
  private handleToolsList(req: { id?: unknown }, transport: { send: (response: unknown) => void }): void {
    if (!this.mcpServerService) {
      this.sendServiceNotInitializedError(req, transport);
      return;
    }
    
    try {
      const tools = this.mcpServerService.getAvailableTools();
      transport.send({
        jsonrpc: HttpTransport.jsonrpcVersion,
        id: req.id,
        result: { tools },
      });
    } catch (error) {
      this.sendError(req, transport, -32603, 'Error listing tools', error);
    }
  }

  /**
   * Handle tools/call request
   * @private
   */
  private handleToolsCall(req: { id?: unknown; params?: unknown }, transport: { send: (response: unknown) => void }): void {
    if (!this.mcpServerService) {
      this.sendServiceNotInitializedError(req, transport);
      return;
    }
    
    try {
      const params = req.params as { name?: string; arguments?: unknown };
      const toolName = params?.name;
      const toolArgs = (params?.arguments as Record<string, unknown>) ?? {};
      
      if (!toolName) {
        this.sendError(req, transport, -32602, 'Tool name is required');
        return;
      }
      
      const result = this.mcpServerService.executeToolCall(toolName, toolArgs);
      transport.send({
        jsonrpc: HttpTransport.jsonrpcVersion,
        id: req.id,
        result,
      });
    } catch (error) {
      this.sendError(req, transport, -32603, 'Tool execution failed', error);
    }
  }

  /**
   * Handle resources/list request
   * @private
   */
  private handleResourcesList(req: { id?: unknown }, transport: { send: (response: unknown) => void }): void {
    if (!this.mcpServerService) {
      this.sendServiceNotInitializedError(req, transport);
      return;
    }
    
    try {
      const resources = this.mcpServerService.getAvailableResources();
      transport.send({
        jsonrpc: HttpTransport.jsonrpcVersion,
        id: req.id,
        result: { resources },
      });
    } catch (error) {
      this.sendError(req, transport, -32603, 'Error listing resources', error);
    }
  }

  /**
   * Handle resources/read request
   * @private
   */
  private handleResourcesRead(req: { id?: unknown; params?: unknown }, transport: { send: (response: unknown) => void }): void {
    if (!this.mcpServerService) {
      this.sendServiceNotInitializedError(req, transport);
      return;
    }
    
    try {
      const params = req.params as { uri?: string };
      const uri = params?.uri;
      
      if (!uri) {
        this.sendError(req, transport, -32602, 'Resource URI is required');
        return;
      }
      
      const result = this.mcpServerService.readResource(uri);
      transport.send({
        jsonrpc: HttpTransport.jsonrpcVersion,
        id: req.id,
        result,
      });
    } catch (error) {
      this.sendError(req, transport, -32603, 'Error reading resource', error);
    }
  }

  /**
   * Handle unknown method request
   * @private
   */
  private handleUnknownMethod(req: { id?: unknown; method?: string }, transport: { send: (response: unknown) => void }): void {
    transport.send({
      jsonrpc: HttpTransport.jsonrpcVersion,
      id: req.id,
      error: {
        code: -32601,
        message: `Method not implemented: ${req.method}`,
      },
    });
  }

  /**
   * Send service not initialized error
   * @private
   */
  private sendServiceNotInitializedError(req: { id?: unknown }, transport: { send: (response: unknown) => void }): void {
    transport.send({
      jsonrpc: HttpTransport.jsonrpcVersion,
      id: req.id,
      error: {
        code: -32603,
        message: 'MCP server service not initialized',
      },
    });
  }

  /**
   * Send error response
   * @private
   */
  private sendError(
    req: { id?: unknown }, 
    transport: { send: (response: unknown) => void }, 
    code: number, 
    message: string, 
    error?: unknown
  ): void {
    const errorResponse: {
      code: number;
      message: string;
      data?: string;
    } = {
      code,
      message,
    };

    if (error) {
      errorResponse.data = error instanceof Error ? error.message : 'Unknown error';
    }

    transport.send({
      jsonrpc: HttpTransport.jsonrpcVersion,
      id: req.id,
      error: errorResponse,
    });
  }

  /**
   * Handle error in request processing.
   * @private
   */
  private handleError(request: unknown, transport: { send: (response: unknown) => void }, error: unknown): void {
    transport.send({
      jsonrpc: HttpTransport.jsonrpcVersion,
      id: request && typeof request === 'object' ? (request as { id?: unknown }).id : undefined,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
