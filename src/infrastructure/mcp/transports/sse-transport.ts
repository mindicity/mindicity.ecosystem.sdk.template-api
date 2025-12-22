import { createServer, Server as HttpServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { McpTransport, TransportConfig } from './base-transport';

/**
 * Server-Sent Events transport implementation for MCP server.
 * Provides SSE endpoint for real-time MCP communication with AI agents.
 */
export class SseTransport implements McpTransport {
  private httpServer: HttpServer | null = null;
  private mcpServer: Server | null = null;
  private clients: Set<ServerResponse> = new Set();

  constructor(private readonly config: TransportConfig) {}

  async connect(server: Server): Promise<void> {
    this.mcpServer = server;
    
    this.httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url || '', true);
      
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

    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.config.port, this.config.host, () => {
        resolve();
      });

      this.httpServer!.on('error', (error) => {
        reject(error);
      });
    });
  }

  async disconnect(): Promise<void> {
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
  }

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

    req.on('end', async () => {
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
      } catch (error) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error',
            data: error instanceof Error ? error.message : 'Unknown error',
          },
        };

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorResponse));
      }
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
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(info));
  }

  /**
   * Process MCP request and return response.
   * @private
   */
  private async processMcpRequest(request: unknown): Promise<unknown> {
    const req = request as { method?: string; id?: unknown; params?: unknown };
    
    if (req.method === 'initialize') {
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

    // For other methods, return not implemented
    return {
      jsonrpc: '2.0',
      id: req.id,
      error: {
        code: -32601,
        message: 'Method not implemented in SSE transport',
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
      } catch (error) {
        // Remove client if sending fails
        this.clients.delete(client);
      }
    }
  }
}