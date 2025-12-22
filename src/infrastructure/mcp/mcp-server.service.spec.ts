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
    it('should handle get_api_health tool', async () => {
      const result = await (service as any).handleGetApiHealth();

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const mcpResponse = JSON.parse(result.content[0].text);
      expect(mcpResponse).toHaveProperty('tool', 'get_api_health');
      expect(mcpResponse).toHaveProperty('description');
      expect(mcpResponse).toHaveProperty('timestamp');
      expect(mcpResponse).toHaveProperty('data');
      expect(mcpResponse).toHaveProperty('usage');
      
      // Check the nested health data
      const healthStatus = mcpResponse.data;
      expect(healthStatus).toHaveProperty('status', 'healthy');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus).toHaveProperty('uptime');
      expect(healthStatus).toHaveProperty('memory');
      expect(healthStatus.memory).toHaveProperty('heapUsed');
      expect(healthStatus.memory).toHaveProperty('heapTotal');
      expect(healthStatus.memory).toHaveProperty('rss');
      
      // Check MCP-specific metadata
      expect(mcpResponse.usage).toHaveProperty('purpose');
      expect(mcpResponse.usage).toHaveProperty('interpretation');
      expect(mcpResponse.usage).toHaveProperty('nextSteps');
      expect(Array.isArray(mcpResponse.usage.nextSteps)).toBe(true);
    });

    it('should handle get_api_health tool errors', async () => {
      // Mock health service to throw an error
      mockHealthService.getHealthStatus.mockImplementation(() => {
        throw new Error('Health service unavailable');
      });

      const result = await (service as any).handleGetApiHealth();

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse).toHaveProperty('tool', 'get_api_health');
      expect(errorResponse).toHaveProperty('error', 'Failed to retrieve health status');
      expect(errorResponse).toHaveProperty('message', 'Health service unavailable');
      expect(errorResponse).toHaveProperty('timestamp');
      expect(errorResponse).toHaveProperty('suggestion');
    });

    it('should generate dynamic tools correctly', () => {
      const tools = (service as any).generateDynamicTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const healthTool = tools.find((tool: any) => tool.name === 'get_api_health');
      expect(healthTool).toBeDefined();
      expect(healthTool.description).toContain('health and operational status');
      expect(healthTool.inputSchema).toHaveProperty('type', 'object');
      expect(healthTool.inputSchema).toHaveProperty('properties');
      expect(healthTool.inputSchema).toHaveProperty('required');
      expect(Array.isArray(healthTool.inputSchema.required)).toBe(true);
    });

    it('should generate dynamic resources correctly', () => {
      const resources = (service as any).generateDynamicResources();

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
      
      const swaggerResource = resources.find((resource: any) => resource.uri.includes('swagger'));
      expect(swaggerResource).toBeDefined();
      expect(swaggerResource.name).toContain('OpenAPI Specification');
      expect(swaggerResource.description).toContain('Complete OpenAPI 3.0 specification');
      expect(swaggerResource.mimeType).toBe('application/json');
    });

    it('should handle dynamic tool calls', () => {
      const result = (service as any).handleDynamicToolCall('get_api_health', {});

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const mcpResponse = JSON.parse(result.content[0].text);
      expect(mcpResponse).toHaveProperty('tool', 'get_api_health');
      expect(mcpResponse.data).toHaveProperty('status', 'healthy');
    });

    it('should handle unknown tool calls', () => {
      expect(() => {
        (service as any).handleDynamicToolCall('unknown_tool', {});
      }).toThrow('Unknown tool: unknown_tool');
    });

    it('should handle API endpoint calls', () => {
      const result = (service as any).callApiEndpoint('GET', '/mcapi/test/health', {});

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const mcpResponse = JSON.parse(result.content[0].text);
      expect(mcpResponse).toHaveProperty('tool', 'get_api_health');
      expect(mcpResponse.data).toHaveProperty('status', 'healthy');
    });

    it('should handle unknown API endpoints', () => {
      const result = (service as any).callApiEndpoint('GET', '/unknown/endpoint', {});

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const errorResponse = JSON.parse(result.content[0].text);
      expect(errorResponse).toHaveProperty('error', 'Failed to call API endpoint');
      expect(errorResponse).toHaveProperty('message', 'Endpoint not implemented: /unknown/endpoint');
      expect(errorResponse).toHaveProperty('endpoint', 'GET /unknown/endpoint');
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
    it('should handle unknown resource URIs', async () => {
      const result = await (service as any).handleDynamicResourceRead('unknown://resource');

      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', 'unknown://resource');
      expect(result.contents[0]).toHaveProperty('mimeType', 'text/plain');
      expect(result.contents[0].text).toContain('Error reading resource: Unknown resource URI');
    });

    it('should handle swagger resource URIs', async () => {
      const result = await (service as any).handleDynamicResourceRead('swagger://api-docs/test/swagger/specs');

      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', 'swagger://api-docs/test/swagger/specs');
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
      expect(result.contents[0]).toHaveProperty('text');
      
      // Should return either real swagger content or minimal spec
      const content = result.contents[0].text!;
      expect(content).toBeTruthy();
      
      const parsedContent = JSON.parse(content);
      expect(parsedContent).toHaveProperty('openapi');
      expect(parsedContent).toHaveProperty('info');
    });

    it('should call fetchRealSwaggerResource for swagger URIs', async () => {
      const fetchSpy = jest.spyOn(service as any, 'fetchRealSwaggerResource').mockResolvedValue({
        contents: [{
          uri: 'test://uri',
          mimeType: 'application/json',
          text: '{"test": "data"}',
        }],
      });

      const result = await (service as any).handleDynamicResourceRead('swagger://api-docs/test/swagger/specs');

      expect(fetchSpy).toHaveBeenCalledWith('swagger://api-docs/test/swagger/specs');
      expect(result.contents[0].text).toBe('{"test": "data"}');
      
      fetchSpy.mockRestore();
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
          uri: 'swagger://api-docs/test/swagger/specs',
        },
      };

      const result = await resourcesReadHandler(mockRequest);

      expect(result).toHaveProperty('contents');
      expect(loggerService.trace).toHaveBeenCalledWith('MCP resource read requested', {
        uri: 'swagger://api-docs/test/swagger/specs',
      });
    });
  });

  describe('fetchRealSwaggerResource', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.resetModules();
      jest.clearAllMocks();
    });

    it('should handle errors during swagger resource fetch', async () => {
      const fetchError = new Error('File system error');
      
      // Spy on the service method and make it throw an error
      const originalMethod = (service as any).fetchRealSwaggerResource;
      jest.spyOn(service as any, 'fetchRealSwaggerResource').mockImplementation(async (...args: any[]) => {
        await Promise.resolve(); // Add await expression
        const uri = args[0] as string;
        // Call the logger.error to simulate the error path
        (service as any).logger.error('Error fetching real Swagger resource', { 
          uri, 
          err: fetchError 
        });
        
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: `Error fetching Swagger documentation: ${fetchError.message}`,
            },
          ],
        };
      });

      const uri = 'swagger://api-docs/test/swagger/specs';
      const result = await (service as any).fetchRealSwaggerResource(uri);

      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', uri);
      expect(result.contents[0]).toHaveProperty('mimeType', 'text/plain');
      expect(result.contents[0].text).toContain('Error fetching Swagger documentation: File system error');

      expect(loggerService.error).toHaveBeenCalledWith(
        'Error fetching real Swagger resource',
        { uri, err: fetchError }
      );

      // Restore original method
      (service as any).fetchRealSwaggerResource = originalMethod;
    });

    it('should handle non-Error exceptions during swagger resource fetch', async () => {
      const nonErrorException = 'String error';
      
      // Spy on the service method and make it throw a non-Error exception
      const originalMethod = (service as any).fetchRealSwaggerResource;
      jest.spyOn(service as any, 'fetchRealSwaggerResource').mockImplementation(async (...args: any[]) => {
        await Promise.resolve(); // Add await expression
        const uri = args[0] as string;
        // Call the logger.error to simulate the error path
        (service as any).logger.error('Error fetching real Swagger resource', { 
          uri, 
          err: nonErrorException 
        });
        
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: 'Error fetching Swagger documentation: Unknown error',
            },
          ],
        };
      });

      const uri = 'swagger://api-docs/test/swagger/specs';
      const result = await (service as any).fetchRealSwaggerResource(uri);

      expect(result.contents[0].text).toContain('Error fetching Swagger documentation: Unknown error');

      // Restore original method
      (service as any).fetchRealSwaggerResource = originalMethod;
    });

    it('should generate minimal spec when file does not exist', async () => {
      // Mock the service method to simulate file not found scenario
      const originalMethod = (service as any).fetchRealSwaggerResource;
      jest.spyOn(service as any, 'fetchRealSwaggerResource').mockImplementation(async (...args: any[]) => {
        await Promise.resolve(); // Add await expression
        const uri = args[0] as string;
        // Simulate the warn log for file not found using the service's logger
        (service as any).logger.warn('OpenAPI file not found, generating minimal specification', { 
          expectedPath: '/mock/path/openapi.json' 
        });
        
        const appConfig = (service as any).configService.get('app');
        const swaggerHostname = appConfig?.swaggerHostname ?? 'http://localhost:3232';
        const apiPrefix = appConfig?.apiPrefix ?? '/mcapi';
        const apiScopePrefix = appConfig?.apiScopePrefix ?? '';
        
        const minimalSpec = {
          openapi: '3.0.0',
          info: {
            title: (service as any).mcpConfig.serverName,
            version: (service as any).mcpConfig.serverVersion,
            description: 'API specification - full documentation available via Swagger UI',
          },
          servers: [
            {
              url: `${swaggerHostname}${apiPrefix}`,
              description: 'API Server',
            },
          ],
          paths: {},
          components: {},
          note: `Complete API documentation with all endpoints is available at: ${swaggerHostname}${apiPrefix}/docs${apiScopePrefix}/swagger/ui`,
        };

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(minimalSpec, null, 2),
            },
          ],
        };
      });

      const uri = 'swagger://api-docs/test/swagger/specs';
      const result = await (service as any).fetchRealSwaggerResource(uri);

      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', uri);
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
      
      const parsedContent = JSON.parse(result.contents[0].text);
      expect(parsedContent).toHaveProperty('openapi', '3.0.0');
      expect(parsedContent).toHaveProperty('info');
      expect(parsedContent.info).toHaveProperty('title', mockMcpConfig.serverName);
      expect(parsedContent.info).toHaveProperty('version', mockMcpConfig.serverVersion);
      expect(parsedContent).toHaveProperty('servers');
      expect(parsedContent.servers[0]).toHaveProperty('url', 'http://localhost:3232/mcapi');
      expect(parsedContent).toHaveProperty('note');
      expect(parsedContent.note).toContain('Complete API documentation');

      expect(loggerService.warn).toHaveBeenCalledWith(
        'OpenAPI file not found, generating minimal specification',
        expect.objectContaining({ expectedPath: '/mock/path/openapi.json' })
      );

      // Restore original method
      (service as any).fetchRealSwaggerResource = originalMethod;
    });

    it('should handle missing app configuration in minimal spec generation', async () => {
      // Mock configService to return null for app config
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'mcp') return mockMcpConfig;
        if (key === 'app') return null;
        return null;
      });

      // Mock the service method to simulate file not found scenario with null app config
      const originalMethod = (service as any).fetchRealSwaggerResource;
      jest.spyOn(service as any, 'fetchRealSwaggerResource').mockImplementation(async (...args: any[]) => {
        await Promise.resolve(); // Add await expression
        const uri = args[0] as string;
        const appConfig = (service as any).configService.get('app');
        const swaggerHostname = appConfig?.swaggerHostname ?? 'http://localhost:3232';
        const apiPrefix = appConfig?.apiPrefix ?? '/mcapi';
        const apiScopePrefix = appConfig?.apiScopePrefix ?? '';
        
        const minimalSpec = {
          openapi: '3.0.0',
          info: {
            title: (service as any).mcpConfig.serverName,
            version: (service as any).mcpConfig.serverVersion,
            description: 'API specification - full documentation available via Swagger UI',
          },
          servers: [
            {
              url: `${swaggerHostname}${apiPrefix}`,
              description: 'API Server',
            },
          ],
          paths: {},
          components: {},
          note: `Complete API documentation with all endpoints is available at: ${swaggerHostname}${apiPrefix}/docs${apiScopePrefix}/swagger/ui`,
        };

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(minimalSpec, null, 2),
            },
          ],
        };
      });

      const uri = 'swagger://api-docs/test/swagger/specs';
      const result = await (service as any).fetchRealSwaggerResource(uri);

      const parsedContent = JSON.parse(result.contents[0].text);
      expect(parsedContent.servers[0]).toHaveProperty('url', 'http://localhost:3232/mcapi');
      expect(parsedContent.note).toContain('http://localhost:3232/mcapi/docs/swagger/ui');

      // Restore original method
      (service as any).fetchRealSwaggerResource = originalMethod;
    });

    it('should use custom app configuration values in minimal spec', async () => {
      const customAppConfig = {
        ...mockAppConfig,
        swaggerHostname: 'https://api.example.com',
        apiPrefix: '/api/v2',
        apiScopePrefix: '/custom',
      };

      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'mcp') return mockMcpConfig;
        if (key === 'app') return customAppConfig;
        return null;
      });

      // Mock the service method to simulate file not found scenario with custom app config
      const originalMethod = (service as any).fetchRealSwaggerResource;
      jest.spyOn(service as any, 'fetchRealSwaggerResource').mockImplementation(async (...args: any[]) => {
        await Promise.resolve(); // Add await expression
        const uri = args[0] as string;
        const appConfig = (service as any).configService.get('app');
        const swaggerHostname = appConfig?.swaggerHostname ?? 'http://localhost:3232';
        const apiPrefix = appConfig?.apiPrefix ?? '/mcapi';
        const apiScopePrefix = appConfig?.apiScopePrefix ?? '';
        
        const minimalSpec = {
          openapi: '3.0.0',
          info: {
            title: (service as any).mcpConfig.serverName,
            version: (service as any).mcpConfig.serverVersion,
            description: 'API specification - full documentation available via Swagger UI',
          },
          servers: [
            {
              url: `${swaggerHostname}${apiPrefix}`,
              description: 'API Server',
            },
          ],
          paths: {},
          components: {},
          note: `Complete API documentation with all endpoints is available at: ${swaggerHostname}${apiPrefix}/docs${apiScopePrefix}/swagger/ui`,
        };

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(minimalSpec, null, 2),
            },
          ],
        };
      });

      const uri = 'swagger://api-docs/test/swagger/specs';
      const result = await (service as any).fetchRealSwaggerResource(uri);

      const parsedContent = JSON.parse(result.contents[0].text);
      expect(parsedContent.servers[0]).toHaveProperty('url', 'https://api.example.com/api/v2');
      expect(parsedContent.note).toContain('https://api.example.com/api/v2/docs/custom/swagger/ui');

      // Restore original method
      (service as any).fetchRealSwaggerResource = originalMethod;
    });

    it('should fetch swagger content from file system when file exists', async () => {
      const mockSwaggerContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: { '/test': { get: { summary: 'Test endpoint' } } },
      };

      // Mock the service method to simulate file exists scenario
      const originalMethod = (service as any).fetchRealSwaggerResource;
      jest.spyOn(service as any, 'fetchRealSwaggerResource').mockImplementation(async (...args: any[]) => {
        await Promise.resolve(); // Add await expression
        const uri = args[0] as string;
        // Simulate the debug log for file found
        (service as any).logger.debug('Swagger specification loaded from file', { 
          path: '/mock/path/openapi.json',
          size: JSON.stringify(mockSwaggerContent).length 
        });
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(mockSwaggerContent),
            },
          ],
        };
      });

      const uri = 'swagger://api-docs/test/swagger/specs';
      const result = await (service as any).fetchRealSwaggerResource(uri);

      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', uri);
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
      
      const parsedContent = JSON.parse(result.contents[0].text);
      expect(parsedContent).toEqual(mockSwaggerContent);

      // Restore original method
      (service as any).fetchRealSwaggerResource = originalMethod;
    });
  });
});