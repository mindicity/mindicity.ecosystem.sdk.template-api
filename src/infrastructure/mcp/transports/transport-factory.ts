import { McpTransport, TransportConfig } from './base-transport';
import { HttpTransport } from './http-transport';
import { SseTransport } from './sse-transport';
import { StdioTransport } from './stdio-transport';
import { OptionalTransportDependencies, validateTransportDependencies } from './transport-dependencies';

/**
 * Factory class for creating MCP transport instances.
 * Provides a centralized way to create different transport types based on configuration.
 */
export class TransportFactory {
  /**
   * Create a transport instance based on the provided configuration.
   * 
   * **SCALABILITY DESIGN:**
   * This method uses a dependencies container pattern that scales seamlessly.
   * Whether you have 1 service or 10 services, the method signature stays the same.
   * Just extend the TransportDependencies interface to add new services.
   * 
   * @param config - Transport configuration
   * @param dependencies - Container with all services needed by transports
   * @returns Transport instance
   * @throws Error if transport type is not supported or required dependencies are missing
   * 
   * @example
   * ```typescript
   * // Works with 1 service
   * const deps1 = { healthService };
   * TransportFactory.createTransport(config, deps1);
   * 
   * // Works with many services - same signature!
   * const deps2 = { healthService, userService, notificationService, analyticsService };
   * TransportFactory.createTransport(config, deps2);
   * ```
   */
  static createTransport(config: TransportConfig, dependencies?: OptionalTransportDependencies): McpTransport {
    // Validate dependencies for the specific transport type
    validateTransportDependencies(config.transport, dependencies);

    switch (config.transport) {
      case 'stdio':
        return new StdioTransport(config);
      
      case 'http':
        if (!config.port || !config.host) {
          throw new Error('HTTP transport requires port and host configuration');
        }
        // Dependencies already validated by validateTransportDependencies
        return new HttpTransport(config, dependencies!);
      
      case 'sse':
        if (!config.port || !config.host) {
          throw new Error('SSE transport requires port and host configuration');
        }
        // SSE transport no longer requires dependencies (simplified implementation)
        return new SseTransport(config, dependencies ?? {});
      
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