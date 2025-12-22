import { HealthService } from '../../../modules/health/health.service';

import { HttpTransport } from './http-transport';
import { SseTransport } from './sse-transport';
import { StdioTransport } from './stdio-transport';
import { createTransportDependencies, OptionalTransportDependencies } from './transport-dependencies';
import { TransportFactory } from './transport-factory';

describe('TransportFactory', () => {
  let mockHealthService: jest.Mocked<HealthService>;
  let dependencies: OptionalTransportDependencies;

  beforeEach(() => {
    mockHealthService = {
      getHealthStatus: jest.fn().mockReturnValue({
        status: 'healthy',
        timestamp: '2025-12-22T14:00:00.000Z',
        server: 'test-server',
        version: '1.0.0',
        uptime: 123.456,
        memory: {
          rss: 124878848,
          heapTotal: 45776896,
          heapUsed: 42331056,
          external: 2981905,
          arrayBuffers: 8466399,
        },
        environment: 'test',
      }),
      getSimpleHealthStatus: jest.fn().mockReturnValue({
        status: 'ok',
        version: '1.0.0',
      }),
    } as any;

    // Use the helper function to create dependencies
    dependencies = createTransportDependencies({
      healthService: mockHealthService,
    });
  });

  describe('createTransport', () => {
    it('should create stdio transport', () => {
      const config = {
        transport: 'stdio' as const,
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      const transport = TransportFactory.createTransport(config);
      expect(transport).toBeInstanceOf(StdioTransport);
    });

    it('should create http transport with valid config', () => {
      const config = {
        transport: 'http' as const,
        port: 3233,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      const transport = TransportFactory.createTransport(config, dependencies);
      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should create sse transport with valid config (no dependencies required)', () => {
      const config = {
        transport: 'sse' as const,
        port: 3233,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      // SSE transport no longer requires dependencies
      const transport = TransportFactory.createTransport(config);
      expect(transport).toBeInstanceOf(SseTransport);
    });

    it('should create sse transport with dependencies (optional)', () => {
      const config = {
        transport: 'sse' as const,
        port: 3233,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      // Dependencies are optional for SSE transport
      const transport = TransportFactory.createTransport(config, dependencies);
      expect(transport).toBeInstanceOf(SseTransport);
    });

    it('should throw error for http transport without port', () => {
      const config = {
        transport: 'http' as const,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      expect(() => TransportFactory.createTransport(config, dependencies)).toThrow(
        'HTTP transport requires port and host configuration'
      );
    });

    it('should throw error for http transport without HealthService', () => {
      const config = {
        transport: 'http' as const,
        port: 3233,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      expect(() => TransportFactory.createTransport(config)).toThrow(
        'HTTP transport requires HealthService in dependencies'
      );
    });

    it('should throw error for sse transport without host', () => {
      const config = {
        transport: 'sse' as const,
        port: 3233,
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      expect(() => TransportFactory.createTransport(config)).toThrow(
        'SSE transport requires port and host configuration'
      );
    });

    it('should throw error for unsupported transport', () => {
      const config = {
        transport: 'websocket' as any,
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      expect(() => TransportFactory.createTransport(config)).toThrow(
        'Unsupported transport type: websocket'
      );
    });

    it('should demonstrate scalability with multiple services', () => {
      // This test shows how the pattern scales without changing the factory signature
      const scalableDependencies = createTransportDependencies({
        healthService: mockHealthService,
        // In the future, additional services would be added here:
        // userService: mockUserService,
        // notificationService: mockNotificationService,
      });

      const config = {
        transport: 'http' as const,
        port: 3233,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      const transport = TransportFactory.createTransport(config, scalableDependencies);
      expect(transport).toBeInstanceOf(HttpTransport);
    });
  });

  describe('createTransportDependencies helper', () => {
    it('should create dependencies with validation', () => {
      const deps = createTransportDependencies({
        healthService: mockHealthService,
      });

      expect(deps.healthService).toBe(mockHealthService);
    });

    it('should throw error when HealthService is missing', () => {
      expect(() => createTransportDependencies({})).toThrow(
        'HealthService is required for MCP transports'
      );
    });
  });

  describe('getSupportedTransports', () => {
    it('should return all supported transport types', () => {
      const supported = TransportFactory.getSupportedTransports();
      expect(supported).toEqual(['stdio', 'http', 'sse']);
    });
  });

  describe('validateConfig', () => {
    it('should validate stdio transport config', () => {
      const config = {
        transport: 'stdio' as const,
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      expect(() => TransportFactory.validateConfig(config)).not.toThrow();
    });

    it('should validate http transport config', () => {
      const config = {
        transport: 'http' as const,
        port: 3233,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      expect(() => TransportFactory.validateConfig(config)).not.toThrow();
    });

    it('should throw error for missing transport type', () => {
      const config = {
        serverName: 'test-server',
        serverVersion: '1.0.0',
      } as any;

      expect(() => TransportFactory.validateConfig(config)).toThrow(
        'Transport type is required'
      );
    });

    it('should throw error for unsupported transport type', () => {
      const config = {
        transport: 'invalid' as any,
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      expect(() => TransportFactory.validateConfig(config)).toThrow(
        'Unsupported transport type: invalid'
      );
    });

    it('should throw error for http transport without port', () => {
      const config = {
        transport: 'http' as const,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      expect(() => TransportFactory.validateConfig(config)).toThrow(
        'HTTP transport requires port configuration'
      );
    });

    it('should throw error for invalid port range', () => {
      const config = {
        transport: 'http' as const,
        port: 70000,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      expect(() => TransportFactory.validateConfig(config)).toThrow(
        'Port must be between 1 and 65535'
      );
    });

    it('should throw error for empty server name', () => {
      const config = {
        transport: 'stdio' as const,
        serverName: '',
        serverVersion: '1.0.0',
      };

      expect(() => TransportFactory.validateConfig(config)).toThrow(
        'Server name is required'
      );
    });

    it('should throw error for empty server version', () => {
      const config = {
        transport: 'stdio' as const,
        serverName: 'test-server',
        serverVersion: '',
      };

      expect(() => TransportFactory.validateConfig(config)).toThrow(
        'Server version is required'
      );
    });
  });
});