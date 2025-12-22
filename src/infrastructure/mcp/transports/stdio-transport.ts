import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { McpTransport, TransportConfig } from './base-transport';

/**
 * Stdio transport implementation for MCP server.
 * Uses standard input/output for communication with AI agents.
 */
export class StdioTransport implements McpTransport {
  private transport: StdioServerTransport | null = null;

  constructor(private readonly config: TransportConfig) {}

  async connect(server: Server): Promise<void> {
    this.transport = new StdioServerTransport();
    await server.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    // StdioServerTransport doesn't have explicit cleanup
    this.transport = null;
  }

  getTransportInfo(): { type: string; details: Record<string, unknown> } {
    return {
      type: 'stdio',
      details: {
        serverName: this.config.serverName,
        version: this.config.serverVersion,
      },
    };
  }
}