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

  /**
   * Connect the stdio transport to the MCP server.
   * 
   * @param server - MCP server instance to connect to
   * @returns Promise that resolves when connection is established
   */
  async connect(server: Server): Promise<void> {
    this.transport = new StdioServerTransport();
    await server.connect(this.transport);
  }

  /**
   * Disconnect the stdio transport and cleanup resources.
   * 
   * @returns Promise that resolves when cleanup is complete
   */
  disconnect(): Promise<void> {
    // StdioServerTransport doesn't have explicit cleanup
    this.transport = null;
    return Promise.resolve();
  }

  /**
   * Get transport information and configuration details.
   * 
   * @returns Transport type and configuration details
   */
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