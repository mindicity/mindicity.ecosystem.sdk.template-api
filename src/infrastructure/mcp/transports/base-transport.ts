import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Base interface for MCP transport implementations.
 * Defines the contract that all transport types must implement.
 */
export interface McpTransport {
  /**
   * Connect the MCP server to this transport.
   * @param server - The MCP server instance to connect
   * @returns Promise that resolves when connection is established
   */
  connect(server: Server): Promise<void>;

  /**
   * Disconnect and cleanup the transport.
   * @returns Promise that resolves when cleanup is complete
   */
  disconnect(): Promise<void>;

  /**
   * Get transport-specific information for logging.
   * @returns Object containing transport details
   */
  getTransportInfo(): {
    type: string;
    details: Record<string, unknown>;
  };
}

/**
 * Configuration interface for transport creation.
 */
export interface TransportConfig {
  transport: 'stdio' | 'http' | 'sse';
  port?: number;
  host?: string;
  serverName: string;
  serverVersion: string;
}