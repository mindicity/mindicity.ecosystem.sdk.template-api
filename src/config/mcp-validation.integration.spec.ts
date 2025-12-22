import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ContextLoggerService } from '../common/services/context-logger.service';
import { McpServerService } from '../infrastructure/mcp/mcp-server.service';
import { TransportFactory } from '../infrastructure/mcp/transports/transport-factory';

import mcpConfig from './mcp.config';

describe('MCP Configuration Validation Integration', () => {
  const mockLoggerService = {
    child: jest.fn().mockReturnThis(),
    setContext: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any cached values
    delete (global as any).__MCP_CONFIG_CACHE__;
  });

  describe('Configuration Loading and Validation', () => {
    it('should load valid stdio configuration', () => {
      process.env.MCP_ENABLED = 'true';
      process.env.MCP_TRANSPORT = 'stdio';
      process.env.MCP_SERVER_NAME = 'test-server';
      process.env.MCP_SERVER_VERSION = '1.0.0';

      const config = mcpConfig();

      expect(config).toEqual({
        enabled: true,
        transport: 'stdio',
        port: 3233,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      });

      expect(() => TransportFactory.validateConfig(config)).not.toThrow();
    });

    it('should load valid HTTP configuration', () => {
      process.env.MCP_ENABLED = 'true';
      process.env.MCP_TRANSPORT = 'http';
      process.env.MCP_PORT = '3234';
      process.env.MCP_HOST = '0.0.0.0';
      process.env.MCP_SERVER_NAME = 'http-server';
      process.env.MCP_SERVER_VERSION = '2.0.0';

      const config = mcpConfig();

      expect(config).toEqual({
        enabled: true,
        transport: 'http',
        port: 3234,
        host: '0.0.0.0',
        serverName: 'http-server',
        serverVersion: '2.0.0',
      });

      expect(() => TransportFactory.validateConfig(config)).not.toThrow();
    });

    it('should load valid SSE configuration', () => {
      process.env.MCP_ENABLED = 'true';
      process.env.MCP_TRANSPORT = 'sse';
      process.env.MCP_PORT = '3235';
      process.env.MCP_HOST = '127.0.0.1';
      process.env.MCP_SERVER_NAME = 'sse-server';
      process.env.MCP_SERVER_VERSION = '3.0.0';

      const config = mcpConfig();

      expect(config).toEqual({
        enabled: true,
        transport: 'sse',
        port: 3235,
        host: '127.0.0.1',
        serverName: 'sse-server',
        serverVersion: '3.0.0',
      });

      expect(() => TransportFactory.validateConfig(config)).not.toThrow();
    });

    it('should use defaults for missing optional values', () => {
      process.env.MCP_ENABLED = 'true';
      process.env.MCP_TRANSPORT = 'stdio';
      // Don't set MCP_SERVER_NAME and MCP_SERVER_VERSION to test package.json fallback
      delete process.env.MCP_SERVER_NAME;
      delete process.env.MCP_SERVER_VERSION;

      const config = mcpConfig();

      expect(config.enabled).toBe(true);
      expect(config.transport).toBe('stdio');
      expect(config.port).toBe(3233); // default
      expect(config.host).toBe('localhost'); // default
      expect(config.serverName).toBeDefined(); // from package.json or fallback
      expect(config.serverVersion).toBeDefined(); // from package.json or fallback
    });

    it('should handle disabled MCP server', () => {
      process.env.MCP_ENABLED = 'false';

      const config = mcpConfig();

      expect(config.enabled).toBe(false);
      // Other values should still be present for potential future use
      expect(config.transport).toBeDefined();
      expect(config.serverName).toBeDefined();
      expect(config.serverVersion).toBeDefined();
    });
  });

  describe('Invalid Configuration Scenarios', () => {
    it('should handle invalid transport type', () => {
      process.env.MCP_ENABLED = 'true';
      process.env.MCP_TRANSPORT = 'websocket'; // invalid
      process.env.MCP_SERVER_NAME = 'test-server';
      process.env.MCP_SERVER_VERSION = '1.0.0';

      const config = mcpConfig();

      // Config should load with default transport
      expect(config.transport).toBe('stdio'); // fallback to default

      // But validation should catch the issue
      expect(() => TransportFactory.validateConfig({
        ...config,
        transport: 'websocket' as any,
      })).toThrow('Unsupported transport type: websocket');
    });

    it('should handle invalid port values', () => {
      process.env.MCP_ENABLED = 'true';
      process.env.MCP_TRANSPORT = 'http';
      process.env.MCP_PORT = '70000'; // invalid port
      process.env.MCP_SERVER_NAME = 'test-server';
      process.env.MCP_SERVER_VERSION = '1.0.0';

      // The config function should throw an error due to Zod validation
      expect(() => mcpConfig()).toThrow();
    });

    it('should handle negative port values', () => {
      process.env.MCP_ENABLED = 'true';
      process.env.MCP_TRANSPORT = 'http';
      process.env.MCP_PORT = '-1'; // invalid port
      process.env.MCP_SERVER_NAME = 'test-server';
      process.env.MCP_SERVER_VERSION = '1.0.0';

      // The config function should throw an error due to Zod validation
      expect(() => mcpConfig()).toThrow();
    });

    it('should handle non-numeric port values', () => {
      process.env.MCP_ENABLED = 'true';
      process.env.MCP_TRANSPORT = 'http';
      process.env.MCP_PORT = 'not-a-number';
      process.env.MCP_SERVER_NAME = 'test-server';
      process.env.MCP_SERVER_VERSION = '1.0.0';

      const config = mcpConfig();

      // Should fall back to default port
      expect(config.port).toBe(3233);
    });

    it('should require port for HTTP transport', () => {
      const config = {
        enabled: true,
        transport: 'http' as const,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
        // port is missing
      };

      expect(() => TransportFactory.validateConfig(config as any)).toThrow(
        'HTTP transport requires port configuration'
      );
    });

    it('should require host for HTTP transport', () => {
      const config = {
        enabled: true,
        transport: 'http' as const,
        port: 3233,
        serverName: 'test-server',
        serverVersion: '1.0.0',
        // host is missing
      };

      expect(() => TransportFactory.validateConfig(config as any)).toThrow(
        'HTTP transport requires host configuration'
      );
    });

    it('should require port for SSE transport', () => {
      const config = {
        enabled: true,
        transport: 'sse' as const,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
        // port is missing
      };

      expect(() => TransportFactory.validateConfig(config as any)).toThrow(
        'SSE transport requires port configuration'
      );
    });

    it('should require host for SSE transport', () => {
      const config = {
        enabled: true,
        transport: 'sse' as const,
        port: 3233,
        serverName: 'test-server',
        serverVersion: '1.0.0',
        // host is missing
      };

      expect(() => TransportFactory.validateConfig(config as any)).toThrow(
        'SSE transport requires host configuration'
      );
    });

    it('should require server name', () => {
      const config = {
        enabled: true,
        transport: 'stdio' as const,
        port: 3233,
        host: 'localhost',
        serverVersion: '1.0.0',
        serverName: '', // empty
      };

      expect(() => TransportFactory.validateConfig(config)).toThrow(
        'Server name is required'
      );
    });

    it('should require server version', () => {
      const config = {
        enabled: true,
        transport: 'stdio' as const,
        port: 3233,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '', // empty
      };

      expect(() => TransportFactory.validateConfig(config)).toThrow(
        'Server version is required'
      );
    });
  });

  describe('McpServerService Integration', () => {
    it('should fail to start with invalid configuration', async () => {
      const invalidConfig = {
        enabled: true,
        transport: 'http' as const,
        port: 70000, // invalid port
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'mcp') return invalidConfig;
          if (key === 'app') return {
            port: 3232,
            apiPrefix: '/mcapi',
            apiScopePrefix: '/test',
            corsEnabled: true,
            swaggerHostname: 'http://localhost:3232',
          };
          return null;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          McpServerService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: ContextLoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      const service = module.get<McpServerService>(McpServerService);

      // The error comes from the HTTP server listen method, not from validation
      await expect(service.onModuleInit()).rejects.toThrow();
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Failed to initialize MCP server',
        expect.objectContaining({
          err: expect.objectContaining({
            name: 'RangeError',
            message: expect.stringContaining('options.port should be >= 0 and < 65536'),
          }),
        })
      );
    });

    it('should start successfully with valid configuration', async () => {
      const validConfig = {
        enabled: true,
        transport: 'stdio' as const,
        port: 3233,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'mcp') return validConfig;
          if (key === 'app') return {
            port: 3232,
            apiPrefix: '/mcapi',
            apiScopePrefix: '/test',
            corsEnabled: true,
            swaggerHostname: 'http://localhost:3232',
          };
          return null;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          McpServerService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: ContextLoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      const service = module.get<McpServerService>(McpServerService);

      // Mock the startMcpServer method to avoid actual server startup
      jest.spyOn(service as any, 'startMcpServer').mockResolvedValue(undefined);

      await expect(service.onModuleInit()).resolves.not.toThrow();
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'MCP server initialized successfully',
        {
          serverName: validConfig.serverName,
          version: validConfig.serverVersion,
        }
      );
    });

    it('should skip initialization when disabled', async () => {
      const disabledConfig = {
        enabled: false,
        transport: 'stdio' as const,
        port: 3233,
        host: 'localhost',
        serverName: 'test-server',
        serverVersion: '1.0.0',
      };

      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'mcp') return disabledConfig;
          return null;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          McpServerService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: ContextLoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      const service = module.get<McpServerService>(McpServerService);

      await service.onModuleInit();

      expect(mockLoggerService.info).toHaveBeenCalledWith('MCP server disabled by configuration');
      expect(mockLoggerService.info).not.toHaveBeenCalledWith(
        'MCP server initialized successfully',
        expect.any(Object)
      );
    });
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.MCP_ENABLED;
    delete process.env.MCP_TRANSPORT;
    delete process.env.MCP_PORT;
    delete process.env.MCP_HOST;
    delete process.env.MCP_SERVER_NAME;
    delete process.env.MCP_SERVER_VERSION;
  });
});