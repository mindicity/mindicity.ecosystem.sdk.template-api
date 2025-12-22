import { createServer, Server as HttpServer } from 'http';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { McpTransport, TransportConfig } from './base-transport';

/**
 * HTTP transport implementation for MCP server.
 * Provides HTTP endpoint for MCP communication with AI agents.
 */
export class HttpTransport implements McpTransport {
  private httpServer: HttpServer | null = null;
  private mcpServer: Server | null = null;

  constructor(private readonly config: TransportConfig) {}

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
   * Handle MCP request through HTTP.
   * @private
   */
  private handleMcpRequest(request: unknown, transport: { send: (response: unknown) => void }): void {
    if (!this.mcpServer) {
      throw new Error('MCP server not initialized');
    }

    // This is a simplified implementation
    // In a real scenario, you'd need to properly integrate with the MCP SDK's request handling
    try {
      // For now, we'll handle basic requests manually
      const req = request as { method?: string; params?: unknown };
      
      if (req.method === 'initialize') {
        transport.send({
          jsonrpc: '2.0',
          id: (request as { id?: unknown }).id,
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
      } else {
        // For other requests, return a not implemented response
        transport.send({
          jsonrpc: '2.0',
          id: (request as { id?: unknown }).id,
          error: {
            code: -32601,
            message: 'Method not implemented in HTTP transport',
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