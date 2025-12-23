import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { HealthService } from '../../modules/health/health.service';

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
  let mockHealthService: any;

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
      warn: jest.fn(),
    };

    // Setup mocks
    (TransportFactory.createTransport as jest.Mock).mockReturnValue(mockTransport);
    (TransportFactory.validateConfig as jest.Mock).mockImplementation(() => {});

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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpServerService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ContextLoggerService, useValue: mockLoggerService },
        { provide: HealthService, useValue: mockHealthService },
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
          { provide: HealthService, useValue: mockHealthService },
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
      }, {
        healthService: mockHealthService,
        appConfig: mockAppConfig,
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
    it('should handle get_api_health tool by delegating to HTTP tool', () => {
      const result = (service as any).handleDynamicToolCall('get_api_health', {});

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const healthData = JSON.parse(result.content[0].text);
      expect(healthData).toHaveProperty('status', 'healthy');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('uptime');
      expect(healthData).toHaveProperty('memory');
    });

    it('should handle get_api_health tool errors', () => {
      // Mock health service to throw an error
      mockHealthService.getHealthStatus.mockImplementation(() => {
        throw new Error('Health service unavailable');
      });

      expect(() => {
        (service as any).handleDynamicToolCall('get_api_health', {});
      }).toThrow('Health service unavailable');
    });

    it('should generate dynamic tools correctly', () => {
      const tools = (service as any).generateDynamicTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const healthTool = tools.find((tool: any) => tool.name === 'get_api_health');
      expect(healthTool).toBeDefined();
      expect(healthTool.description).toContain('comprehensive health status');
      expect(healthTool.inputSchema).toHaveProperty('type', 'object');
      expect(healthTool.inputSchema).toHaveProperty('properties');
      expect(healthTool.inputSchema).toHaveProperty('required');
      expect(Array.isArray(healthTool.inputSchema.required)).toBe(true);
    });

    it('should generate dynamic resources correctly', () => {
      const resources = (service as any).generateDynamicResources();

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
      
      const openApiResource = resources.find((resource: any) => resource.uri.includes('openapi'));
      expect(openApiResource).toBeDefined();
      expect(openApiResource.name).toContain('OpenAPI Specification');
      expect(openApiResource.description).toContain('Complete OpenAPI 3.0 specification');
      expect(openApiResource.mimeType).toBe('application/json');
    });

    it('should handle dynamic tool calls', () => {
      const result = (service as any).handleDynamicToolCall('get_api_health', {});

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const healthData = JSON.parse(result.content[0].text);
      expect(healthData).toHaveProperty('status', 'healthy');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('uptime');
      expect(healthData).toHaveProperty('memory');
    });

    it('should handle unknown tool calls', () => {
      expect(() => {
        (service as any).handleDynamicToolCall('unknown_tool', {});
      }).toThrow('Unknown tool: unknown_tool');
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
          { provide: HealthService, useValue: mockHealthService },
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
          { provide: HealthService, useValue: mockHealthService },
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
          { provide: HealthService, useValue: mockHealthService },
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
      }, {
        healthService: mockHealthService,
        appConfig: mockAppConfig,
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
          { provide: HealthService, useValue: mockHealthService },
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
      }, {
        healthService: mockHealthService,
        appConfig: mockAppConfig,
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

  describe('resource handling', () => {
    it('should handle unknown resource URIs', () => {
      const result = (service as any).handleDynamicResourceRead('unknown://resource');

      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', 'unknown://resource');
      expect(result.contents[0]).toHaveProperty('mimeType', 'text/plain');
      expect(result.contents[0].text).toContain('Error reading resource: Unknown resource URI');
    });

    it('should handle swagger resource URIs', () => {
      const result = (service as any).handleDynamicResourceRead('doc://openapi/test/specs');

      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', 'doc://openapi/test/specs');
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
      expect(result.contents[0]).toHaveProperty('text');
      
      // Should return either real swagger content or minimal spec
      const content = result.contents[0].text!;
      expect(content).toBeTruthy();
      
      const parsedContent = JSON.parse(content);
      expect(parsedContent).toHaveProperty('openapi');
      expect(parsedContent).toHaveProperty('info');
    });

    it('should delegate to health module resources for swagger URIs', () => {
      const result = (service as any).handleDynamicResourceRead('doc://openapi/test/specs');

      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', 'doc://openapi/test/specs');
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
      expect(result.contents[0]).toHaveProperty('text');
      
      const parsedContent = JSON.parse(result.contents[0].text!);
      expect(parsedContent).toHaveProperty('openapi', '3.0.0');
      expect(parsedContent.info).toHaveProperty('title', 'NestJS API');
    });
  });

  describe('setup methods', () => {
    it('should setup dynamic tool handlers', () => {
      const mockServer = {
        setRequestHandler: jest.fn(),
      };
      (service as any).server = mockServer;

      (service as any).setupDynamicToolHandlers();

      // Should set up 4 request handlers
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(4);
      expect(loggerService.debug).toHaveBeenCalledWith('Dynamic MCP tool and resource handlers configured');
    });

    it('should not setup handlers when server is null', () => {
      (service as any).server = null;

      (service as any).setupDynamicToolHandlers();

      // Should not throw or call any handlers
      expect(loggerService.debug).not.toHaveBeenCalledWith('Dynamic MCP tool and resource handlers configured');
    });
  });

  describe('request handler implementations', () => {
    let mockServer: any;
    let toolsListHandler: (request: any) => any;
    let toolsCallHandler: (request: any) => any;
    let resourcesListHandler: (request: any) => any;
    let resourcesReadHandler: (request: any) => any;

    beforeEach(() => {
      mockServer = {
        setRequestHandler: jest.fn((schema: any, handler: (request: any) => any) => {
          // Store handlers based on the schema method or a pattern
          if (schema === 'ListToolsRequestSchema' || (typeof schema === 'object' && schema.method === 'tools/list')) {
            toolsListHandler = handler;
          } else if (schema === 'CallToolRequestSchema' || (typeof schema === 'object' && schema.method === 'tools/call')) {
            toolsCallHandler = handler;
          } else if (schema === 'ListResourcesRequestSchema' || (typeof schema === 'object' && schema.method === 'resources/list')) {
            resourcesListHandler = handler;
          } else if (schema === 'ReadResourceRequestSchema' || (typeof schema === 'object' && schema.method === 'resources/read')) {
            resourcesReadHandler = handler;
          } else {
            // Store handlers in order for fallback
            const callIndex = mockServer.setRequestHandler.mock.calls.length - 1;
            if (callIndex === 0) toolsListHandler = handler;
            else if (callIndex === 1) toolsCallHandler = handler;
            else if (callIndex === 2) resourcesListHandler = handler;
            else if (callIndex === 3) resourcesReadHandler = handler;
          }
        }),
      };
      (service as any).server = mockServer;
      (service as any).setupDynamicToolHandlers();
    });

    it('should handle tools/list requests', async () => {
      const result = await toolsListHandler({});

      expect(result).toHaveProperty('tools');
      expect(Array.isArray(result.tools)).toBe(true);
      expect(loggerService.trace).toHaveBeenCalledWith('MCP tools list requested');
    });

    it('should handle tools/call requests', async () => {
      const mockRequest = {
        params: {
          name: 'get_api_health',
          arguments: {},
        },
      };

      const result = await toolsCallHandler(mockRequest);

      expect(result).toHaveProperty('content');
      expect(loggerService.trace).toHaveBeenCalledWith('MCP tool called', {
        toolName: 'get_api_health',
        arguments: {},
      });
    });

    it('should handle resources/list requests', async () => {
      const result = await resourcesListHandler({});

      expect(result).toHaveProperty('resources');
      expect(Array.isArray(result.resources)).toBe(true);
      expect(loggerService.trace).toHaveBeenCalledWith('MCP resources list requested');
    });

    it('should handle resources/read requests', async () => {
      const mockRequest = {
        params: {
          uri: 'doc://openapi/test/specs',
        },
      };

      const result = await resourcesReadHandler(mockRequest);

      expect(result).toHaveProperty('contents');
      expect(loggerService.trace).toHaveBeenCalledWith('MCP resource read requested', {
        uri: 'doc://openapi/test/specs',
      });
    });
  });
});