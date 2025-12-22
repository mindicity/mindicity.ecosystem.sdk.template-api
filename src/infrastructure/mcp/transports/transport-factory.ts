import { McpTransport, TransportConfig } from './base-transport';
import { HttpTransport } from './http-transport';
import { SseTransport } from './sse-transport';
import { StdioTransport } from './stdio-transport';

/**
 * Factory class for creating MCP transport instances.
 * Provides a centralized way to create different transport types based on configuration.
 */
export class TransportFactory {
  /**
   * Create a transport instance based on the provided configuration.
   * 
   * @param config - Transport configuration
   * @returns Transport instance
   * @throws Error if transport type is not supported
   */
  static createTransport(config: TransportConfig): McpTransport {
    switch (config.transport) {
      case 'stdio':
        return new StdioTransport(config);
      
      case 'http':
        if (!config.port || !config.host) {
          throw new Error('HTTP transport requires port and host configuration');
        }
        return new HttpTransport(config);
      
      case 'sse':
        if (!config.port || !config.host) {
          throw new Error('SSE transport requires port and host configuration');
        }
        return new SseTransport(config);
      
      default:
        throw new Error(`Unsupported transport type: ${config.transport}`);
    }
  }

  /**
   * Get list of supported transport types.
   * 
   * @returns Array of supported transport type names
   */
  static getSupportedTransports(): string[] {
    return ['stdio', 'http', 'sse'];
  }

  /**
   * Validate transport configuration.
   * 
   * @param config - Transport configuration to validate
   * @throws Error if configuration is invalid
   */
  static validateConfig(config: TransportConfig): void {
    this.validateBasicConfig(config);
    this.validateNetworkConfig(config);
    this.validateServerInfo(config);
  }

  /**
   * Validate basic transport configuration.
   * @private
   */
  private static validateBasicConfig(config: TransportConfig): void {
    if (!config.transport) {
      throw new Error('Transport type is required');
    }

    if (!this.getSupportedTransports().includes(config.transport)) {
      throw new Error(`Unsupported transport type: ${config.transport}`);
    }
  }

  /**
   * Validate network-related configuration for HTTP/SSE transports.
   * @private
   */
  private static validateNetworkConfig(config: TransportConfig): void {
    if (config.transport === 'http' || config.transport === 'sse') {
      if (!config.port) {
        throw new Error(`${config.transport.toUpperCase()} transport requires port configuration`);
      }

      if (!config.host) {
        throw new Error(`${config.transport.toUpperCase()} transport requires host configuration`);
      }

      if (config.port < 1 || config.port > 65535) {
        throw new Error('Port must be between 1 and 65535');
      }
    }
  }

  /**
   * Validate server information configuration.
   * @private
   */
  private static validateServerInfo(config: TransportConfig): void {
    if (!config.serverName || config.serverName.trim() === '') {
      throw new Error('Server name is required');
    }

    if (!config.serverVersion || config.serverVersion.trim() === '') {
      throw new Error('Server version is required');
    }
  }
}