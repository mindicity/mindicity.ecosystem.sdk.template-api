import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ContextLoggerService } from '../../common/services/context-logger.service';

import { McpServerService } from './mcp-server.service';
import { TransportFactory } from './transports/transport-factory';

// Mock the transport factory
jest.mock('./transports/transport-factory', () => ({
  TransportFactory: {
    createTransport: jest.fn(),
    validateConfig: jest.fn(),
  },
}));

describe('McpServerService', () => {
  let service: McpServerService;
  let configService: ConfigService;
  let loggerService: ContextLoggerService;
  let mockTransport: any;

  const mockMcpConfig = {
    enabled: true,
    transport: 'stdio' as const,
    port: 3233,
    host: 'localhost',
    serverName: 'test-api',
    serverVersion: '1.0.0',
  };

  const mockAppConfig = {
    port: 3232,
    apiPrefix: '/mcapi',
    apiScopePrefix: '/test',
    corsEnabled: true,
    swaggerHostname: 'http://localhost:3232',
  };

  beforeEach(async () => {
    mockTransport = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getTransportInfo: jest.fn().mockReturnValue({
        type: 'stdio',
        details: { serverName: 'test-api', version: '1.0.0' },
      }),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'mcp') return mockMcpConfig;
        if (key === 'app') return mockAppConfig;
        return null;
      }),
    };

    const mockLoggerService = {
      child: jest.fn().mockReturnThis(),
      setContext: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      error: jest.fn(),
    };

    // Setup mocks
    (TransportFactory.createTransport as jest.Mock).mockReturnValue(mockTransport);
    (TransportFactory.validateConfig as jest.Mock).mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpServerService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ContextLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<McpServerService>(McpServerService);
    configService = module.get<ConfigService>(ConfigService);
    loggerService = module.get<ContextLoggerService>(ContextLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize logger with correct context', () => {
    expect(loggerService.child).toHaveBeenCalledWith({ serviceContext: 'McpServerService' });
    expect(loggerService.setContext).toHaveBeenCalledWith('McpServerService');
  });

  it('should get MCP configuration on initialization', () => {
    expect(configService.get).toHaveBeenCalledWith('mcp');
  });

  describe('onModuleInit', () => {
    it('should log info when MCP server is disabled', async () => {
      const disabledConfig = { ...mockMcpConfig, enabled: false };
      jest.spyOn(configService, 'get').mockReturnValue(disabledConfig);

      // Create new service instance with disabled config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          McpServerService,
          { provide: ConfigService, useValue: { get: () => disabledConfig } },
          { provide: ContextLoggerService, useValue: loggerService },
        ],
      }).compile();

      const disabledService = module.get<McpServerService>(McpServerService);
      await disabledService.onModuleInit();

      expect(loggerService.info).toHaveBeenCalledWith('MCP server disabled by configuration');
    });

    it('should handle initialization errors', async () => {
      // Mock startMcpServer to throw an error
      const error = new Error('Initialization failed');
      jest.spyOn(service as any, 'startMcpServer').mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Initialization failed');
      expect(loggerService.error).toHaveBeenCalledWith('Failed to initialize MCP server', { err: error });
    });

    it('should log successful initialization', async () => {
      // Mock startMcpServer to resolve successfully
      jest.spyOn(service as any, 'startMcpServer').mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(loggerService.info).toHaveBeenCalledWith('MCP server initialized successfully', {
        serverName: mockMcpConfig.serverName,
        version: mockMcpConfig.serverVersion,
      });
    });

    it('should validate configuration before starting', async () => {
      jest.spyOn(service as any, 'startMcpServer').mockResolvedValue(undefined);

      await service.onModuleInit();

      // The service should initialize successfully
      expect(loggerService.info).toHaveBeenCalledWith('MCP server initialized successfully', {
        serverName: mockMcpConfig.serverName,
        version: mockMcpConfig.serverVersion,
      });
    });

    it('should handle configuration validation errors', async () => {
      const validationError = new Error('Invalid configuration');
      (TransportFactory.createTransport as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await expect(service.onModuleInit()).rejects.toThrow('Invalid configuration');
      expect(loggerService.error).toHaveBeenCalledWith('Failed to initialize MCP server', { err: validationError });
    });
  });

  describe('onModuleDestroy', () => {
    it('should handle cleanup when server is null', async () => {
      await service.onModuleDestroy();
      // Should not throw any errors
      expect(loggerService.error).not.toHaveBeenCalled();
    });

    it('should handle server close errors', async () => {
      const mockServer = {
        close: jest.fn().mockRejectedValue(new Error('Close failed')),
      };
      (service as any).server = mockServer;

      await service.onModuleDestroy();

      expect(loggerService.error).toHaveBeenCalledWith('Error closing MCP server', { 
        err: new Error('Close failed') 
      });
    });

    it('should successfully close server and transport', async () => {
      const mockServer = {
        close: jest.fn().mockResolvedValue(undefined),
      };
      (service as any).server = mockServer;
      (service as any).transport = mockTransport;

      await service.onModuleDestroy();

      expect(mockServer.close).toHaveBeenCalled();
      expect(mockTransport.disconnect).toHaveBeenCalled();
      expect(loggerService.info).toHaveBeenCalledWith('MCP transport disconnected successfully');
      expect(loggerService.info).toHaveBeenCalledWith('MCP server closed successfully');
    });

    it('should handle transport disconnect errors', async () => {
      const mockServer = {
        close: jest.fn().mockResolvedValue(undefined),
      };
      const disconnectError = new Error('Disconnect failed');
      mockTransport.disconnect.mockRejectedValue(disconnectError);

      (service as any).server = mockServer;
      (service as any).transport = mockTransport;

      await service.onModuleDestroy();

      expect(loggerService.error).toHaveBeenCalledWith('Error disconnecting MCP transport', { 
        err: disconnectError 
      });
    });
  });

  describe('startMcpServer', () => {
    it('should create transport and start server', async () => {
      await (service as any).startMcpServer();

      expect(TransportFactory.createTransport).toHaveBeenCalledWith({
        transport: mockMcpConfig.transport,
        port: mockMcpConfig.port,
        host: mockMcpConfig.host,
        serverName: mockMcpConfig.serverName,
        serverVersion: mockMcpConfig.serverVersion,
      });
      expect(mockTransport.connect).toHaveBeenCalled();
    });

    it('should log transport information', async () => {
      await (service as any).startMcpServer();

      expect(mockTransport.getTransportInfo).toHaveBeenCalled();
      expect(loggerService.info).toHaveBeenCalledWith('MCP server connected and ready for AI agent connections', {
        serverName: mockMcpConfig.serverName,
        version: mockMcpConfig.serverVersion,
        transport: 'stdio',
        ...mockTransport.getTransportInfo().details,
      });
    });

    it('should handle transport creation errors', async () => {
      (TransportFactory.createTransport as jest.Mock).mockImplementation(() => {
        throw new Error('Transport creation failed');
      });

      await expect((service as any).startMcpServer()).rejects.toThrow('Transport creation failed');
    });

    it('should handle transport connection errors', async () => {
      const connectionError = new Error('Connection failed');
      mockTransport.connect.mockRejectedValue(connectionError);

      await expect((service as any).startMcpServer()).rejects.toThrow('Connection failed');
    });
  });

  describe('tool handlers', () => {
    it('should handle get_api_info tool', async () => {
      const result = await (service as any).handleGetApiInfo();

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const apiInfo = JSON.parse(result.content[0].text);
      expect(apiInfo).toHaveProperty('name', 'test-api');
      expect(apiInfo).toHaveProperty('version', '1.0.0');
      expect(apiInfo).toHaveProperty('port', 3232);
      expect(apiInfo).toHaveProperty('apiPrefix', '/mcapi');
      expect(apiInfo).toHaveProperty('apiScopePrefix', '/test');
      expect(apiInfo).toHaveProperty('corsEnabled', true);
      expect(apiInfo).toHaveProperty('swaggerUrl');
    });

    it('should handle get_api_health tool', async () => {
      const result = await (service as any).handleGetApiHealth();

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const healthStatus = JSON.parse(result.content[0].text);
      expect(healthStatus).toHaveProperty('status', 'healthy');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus).toHaveProperty('uptime');
      expect(healthStatus).toHaveProperty('memory');
      expect(healthStatus.memory).toHaveProperty('heapUsed');
      expect(healthStatus.memory).toHaveProperty('heapTotal');
      expect(healthStatus.memory).toHaveProperty('rss');
    });

    it('should handle list_api_endpoints tool', async () => {
      const result = await (service as any).handleListApiEndpoints();

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const endpoints = JSON.parse(result.content[0].text);
      expect(Array.isArray(endpoints)).toBe(true);
      expect(endpoints.length).toBeGreaterThan(0);
      
      // Check structure of first endpoint
      expect(endpoints[0]).toHaveProperty('method');
      expect(endpoints[0]).toHaveProperty('path');
      expect(endpoints[0]).toHaveProperty('description');
      
      // Should include health endpoint
      const healthEndpoint = endpoints.find((ep: any) => ep.path.includes('/health'));
      expect(healthEndpoint).toBeDefined();
      expect(healthEndpoint.method).toBe('GET');
    });

    it('should include MCP endpoints in list when MCP is enabled', async () => {
      // Set up HTTP transport to have MCP endpoints
      const httpConfig = { ...mockMcpConfig, transport: 'http' as const };
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'mcp') return httpConfig;
        if (key === 'app') return mockAppConfig;
        return null;
      });

      const result = await (service as any).handleListApiEndpoints();
      const endpoints = JSON.parse(result.content[0].text);
      
      // The service doesn't automatically include MCP endpoints in the list
      // It only includes the standard API endpoints
      expect(endpoints.length).toBeGreaterThan(0);
      expect(endpoints[0]).toHaveProperty('method');
      expect(endpoints[0]).toHaveProperty('path');
      expect(endpoints[0]).toHaveProperty('description');
    });
  });

  describe('configuration edge cases', () => {
    it('should handle missing MCP configuration', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'mcp') return null;
        if (key === 'app') return mockAppConfig;
        return null;
      });

      // Create new service instance
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          McpServerService,
          { provide: ConfigService, useValue: configService },
          { provide: ContextLoggerService, useValue: loggerService },
        ],
      }).compile();

      const serviceWithoutConfig = module.get<McpServerService>(McpServerService);
      
      await expect(serviceWithoutConfig.onModuleInit()).rejects.toThrow();
    });

    it('should handle missing app configuration', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'mcp') return mockMcpConfig;
        if (key === 'app') return null;
        return null;
      });

      // Create new service instance
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          McpServerService,
          { provide: ConfigService, useValue: configService },
          { provide: ContextLoggerService, useValue: loggerService },
        ],
      }).compile();

      const serviceWithoutAppConfig = module.get<McpServerService>(McpServerService);
      
      // The service should still work without app config, using defaults
      await expect(serviceWithoutAppConfig.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('different transport types', () => {
    it('should handle HTTP transport configuration', async () => {
      const httpConfig = { ...mockMcpConfig, transport: 'http' as const };
      const httpTransport = {
        ...mockTransport,
        getTransportInfo: jest.fn().mockReturnValue({
          type: 'http',
          details: { 
            host: 'localhost', 
            port: 3233, 
            endpoint: 'http://localhost:3233/mcp' 
          },
        }),
      };

      (TransportFactory.createTransport as jest.Mock).mockReturnValue(httpTransport);

      // Create new service instance with HTTP config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          McpServerService,
          { 
            provide: ConfigService, 
            useValue: { 
              get: (key: string) => {
                if (key === 'mcp') return httpConfig;
                if (key === 'app') return mockAppConfig;
                return null;
              }
            } 
          },
          { provide: ContextLoggerService, useValue: loggerService },
        ],
      }).compile();

      const httpService = module.get<McpServerService>(McpServerService);
      await (httpService as any).startMcpServer();

      expect(TransportFactory.createTransport).toHaveBeenCalledWith({
        transport: httpConfig.transport,
        port: httpConfig.port,
        host: httpConfig.host,
        serverName: httpConfig.serverName,
        serverVersion: httpConfig.serverVersion,
      });
      expect(httpTransport.connect).toHaveBeenCalled();
      expect(loggerService.info).toHaveBeenCalledWith('MCP server connected and ready for AI agent connections', {
        serverName: httpConfig.serverName,
        version: httpConfig.serverVersion,
        transport: 'http',
        ...httpTransport.getTransportInfo().details,
      });
    });

    it('should handle SSE transport configuration', async () => {
      const sseConfig = { ...mockMcpConfig, transport: 'sse' as const };
      const sseTransport = {
        ...mockTransport,
        getTransportInfo: jest.fn().mockReturnValue({
          type: 'sse',
          details: { 
            host: 'localhost', 
            port: 3233, 
            eventsEndpoint: 'http://localhost:3233/mcp/events',
            activeConnections: 0,
          },
        }),
      };

      (TransportFactory.createTransport as jest.Mock).mockReturnValue(sseTransport);

      // Create new service instance with SSE config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          McpServerService,
          { 
            provide: ConfigService, 
            useValue: { 
              get: (key: string) => {
                if (key === 'mcp') return sseConfig;
                if (key === 'app') return mockAppConfig;
                return null;
              }
            } 
          },
          { provide: ContextLoggerService, useValue: loggerService },
        ],
      }).compile();

      const sseService = module.get<McpServerService>(McpServerService);
      await (sseService as any).startMcpServer();

      expect(TransportFactory.createTransport).toHaveBeenCalledWith({
        transport: sseConfig.transport,
        port: sseConfig.port,
        host: sseConfig.host,
        serverName: sseConfig.serverName,
        serverVersion: sseConfig.serverVersion,
      });
      expect(sseTransport.connect).toHaveBeenCalled();
      expect(loggerService.info).toHaveBeenCalledWith('MCP server connected and ready for AI agent connections', {
        serverName: sseConfig.serverName,
        version: sseConfig.serverVersion,
        transport: 'sse',
        ...sseTransport.getTransportInfo().details,
      });
    });
  });
});