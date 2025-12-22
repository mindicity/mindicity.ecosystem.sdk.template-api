import { HttpTransport } from './http-transport';
import { SseTransport } from './sse-transport';
import { StdioTransport } from './stdio-transport';
import { TransportFactory } from './transport-factory';

describe('TransportFactory', () => {
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

      const transport = TransportFactory.createTransport(config);
      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should create sse transport with valid config', () => {
      const config = {
        transport: 'sse' as const,
        port: 3233,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      const transport = TransportFactory.createTransport(config);
      expect(transport).toBeInstanceOf(SseTransport);
    });

    it('should throw error for http transport without port', () => {
      const config = {
        transport: 'http' as const,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      expect(() => TransportFactory.createTransport(config)).toThrow(
        'HTTP transport requires port and host configuration'
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