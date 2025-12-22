import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { McpServerService } from './mcp-server.service';

describe('McpServerService', () => {
  let service: McpServerService;
  let configService: ConfigService;
  let loggerService: ContextLoggerService;

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
    });

    it('should handle list_api_endpoints tool', async () => {
      const result = await (service as any).handleListApiEndpoints();

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const endpoints = JSON.parse(result.content[0].text);
      expect(Array.isArray(endpoints)).toBe(true);
      expect(endpoints.length).toBeGreaterThan(0);
      expect(endpoints[0]).toHaveProperty('method');
      expect(endpoints[0]).toHaveProperty('path');
      expect(endpoints[0]).toHaveProperty('description');
    });
  });
});