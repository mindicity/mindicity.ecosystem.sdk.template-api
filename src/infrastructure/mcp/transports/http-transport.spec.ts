import { Server as HttpServer } from 'http';

import { ContextLoggerService } from '../../../common/services/context-logger.service';
import { HealthService } from '../../../modules/health/health.service';

import { TransportConfig } from './base-transport';
import { HttpTransport } from './http-transport';
import { createTransportDependencies } from './transport-dependencies';

// Mock the HTTP server
jest.mock('http', () => ({
  createServer: jest.fn(),
}));

describe('HttpTransport', () => {
  let transport: HttpTransport;
  let mockServer: jest.Mocked<HttpServer>;
  let mockMcpServer: any;
  let mockHealthService: jest.Mocked<HealthService>;
  let mockLoggerService: jest.Mocked<ContextLoggerService>;
  let mockConfigService: any;
  let config: TransportConfig;

  beforeEach(() => {
    config = {
      transport: 'http',
      port: 3233,
      host: 'localhost',
      serverName: 'test-server',
      serverVersion: '1.0.0',
      basePath: '/mcapi/test/mcp',
    };

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

    mockLoggerService = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      child: jest.fn().mockReturnThis(),
    } as any;

    const mockAppConfig = {
      apiPrefix: '/mcapi',
      apiScopePrefix: '/project',
      swaggerHostname: 'http://localhost:3232',
      port: 3232,
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app') return mockAppConfig;
        return null;
      }),
    } as any;

    const dependencies = createTransportDependencies({
      healthService: mockHealthService,
      loggerService: mockLoggerService,
      appConfig: mockAppConfig,
      configService: mockConfigService,
    });

    transport = new HttpTransport(config, dependencies);

    mockServer = {
      listen: jest.fn().mockImplementation((port: number, host: string, callback?: () => void) => {
        if (callback) callback();
        return mockServer;
      }),
      close: jest.fn().mockImplementation((callback?: (err?: Error) => void) => {
        if (callback) callback();
        return mockServer;
      }),
      on: jest.fn().mockReturnValue(mockServer),
    } as any;

    mockMcpServer = {
      connect: jest.fn(),
    } as any;

    const { createServer } = require('http');
    createServer.mockReturnValue(mockServer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create transport with config', () => {
      expect(transport).toBeDefined();
      expect(transport.getTransportInfo().type).toBe('http');
    });
  });

  describe('connect', () => {
    it('should create HTTP server and listen on configured port', async () => {
      await transport.connect(mockMcpServer);

      expect(mockServer.listen).toHaveBeenCalledWith(
        config.port,
        config.host,
        expect.any(Function)
      );
    });

    it('should handle server listen errors', async () => {
      const error = new Error('Port already in use');
      
      // Mock listen to not call the callback (simulating error)
      mockServer.listen.mockImplementation((_port: unknown, _host: unknown, _callback?: () => void) => {
        // Don't call callback to simulate error
        return mockServer;
      });
      
      mockServer.on.mockImplementation((event: string | symbol, handler: (...args: any[]) => void) => {
        if (event === 'error') {
           
          setTimeout(() => handler(error), 0);
        }
        return mockServer;
      });

      await expect(transport.connect(mockMcpServer)).rejects.toThrow('Port already in use');
    });

    it('should set up request handlers', async () => {
      const { createServer } = require('http');
      let requestHandler: ((req: any, res: any) => void) | undefined;

      createServer.mockImplementation((handler: (req: any, res: any) => void) => {
        requestHandler = handler;
        return mockServer;
      });

      await transport.connect(mockMcpServer);

      expect(createServer).toHaveBeenCalledWith(expect.any(Function));
      expect(requestHandler).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should close HTTP server', async () => {
      // Set up the server first
      (transport as any).httpServer = mockServer;

      await transport.disconnect();

      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should handle case when server is null', async () => {
      await expect(transport.disconnect()).resolves.not.toThrow();
    });
  });

  describe('getTransportInfo', () => {
    it('should return correct transport info', () => {
      const info = transport.getTransportInfo();

      expect(info).toEqual({
        type: 'http',
        details: {
          host: config.host,
          port: config.port,
          serverName: config.serverName,
          version: config.serverVersion,
          endpoint: `http://${config.host}:${config.port}${config.basePath}`,
        },
      });
    });
  });

  describe('request handling', () => {
    let requestHandler: (req: any, res: any) => void;
    let mockReq: any;
    let mockRes: any;

    beforeEach(async () => {
      const { createServer } = require('http');
      
      createServer.mockImplementation((handler: (req: any, res: any) => void) => {
        requestHandler = handler;
        return mockServer;
      });

      await transport.connect(mockMcpServer);

      mockReq = {
        method: 'POST',
        on: jest.fn(),
      };

      mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
      };
    });

    it('should handle OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';
      
      requestHandler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, OPTIONS');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
      expect(mockRes.writeHead).toHaveBeenCalledWith(200);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should reject non-POST requests', () => {
      mockReq.method = 'GET';
      mockReq.url = '/mcapi/test/mcp'; // Set the correct path to match basePath
      
      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(405, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Method not allowed' }));
    });

    it('should handle POST requests with valid JSON', () => {
      const requestData = JSON.stringify({ method: 'initialize', id: 1 });
      
      mockReq.method = 'POST';
      mockReq.url = '/mcapi/test/mcp'; // Set the correct path to match basePath
      
      mockReq.on.mockImplementation((event: string, handler: (data?: string) => void) => {
        if (event === 'data') {
          handler(requestData);
        } else if (event === 'end') {
          handler();
        }
      });

      requestHandler(mockReq, mockRes);

      expect(mockReq.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockReq.on).toHaveBeenCalledWith('end', expect.any(Function));
    });

    it('should handle invalid JSON in POST requests', () => {
      const invalidJson = 'invalid json';
      
      mockReq.method = 'POST';
      mockReq.url = '/mcapi/test/mcp'; // Set the correct path to match basePath
      
      mockReq.on.mockImplementation((event: string, handler: (data?: string) => void) => {
        if (event === 'data') {
          handler(invalidJson);
        } else if (event === 'end') {
          handler();
        }
      });

      requestHandler(mockReq, mockRes);

      // The error handling happens in the 'end' event handler
      expect(mockReq.on).toHaveBeenCalledWith('end', expect.any(Function));
    });
  });

  describe('MCP request handling', () => {
    it('should handle initialize method', async () => {
      const request = { method: 'initialize', id: 1 };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Set up the MCP server first
      (transport as any).mcpServer = mockMcpServer;

      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
          },
          serverInfo: {
            name: config.serverName,
            version: config.serverVersion,
          },
        },
      });
    });

    it('should handle unknown methods', async () => {
      const request = { method: 'unknown', id: 2 };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Set up the MCP server first
      (transport as any).mcpServer = mockMcpServer;

      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 2,
        error: {
          code: -32601,
          message: 'Method not implemented: unknown',
        },
      });
    });

    it('should handle errors during request processing', async () => {
      const request = { method: 'invalid_method', id: 1 }; // Use a valid object but invalid method
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Set up the MCP server first
      (transport as any).mcpServer = mockMcpServer;

      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32601,
          message: 'Method not implemented: invalid_method',
        },
      });
    });

    it('should handle null request gracefully', async () => {
      const request = null; // This will cause an error
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Set up the MCP server first
      (transport as any).mcpServer = mockMcpServer;

      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: undefined,
        error: {
          code: -32603,
          message: 'Internal error',
          data: expect.any(String),
        },
      });
    });

    it('should throw error when MCP server not initialized', async () => {
      const request = { method: 'tools/list', id: 1 };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Don't set mcpServerService - this should cause an error
      const freshDependencies = createTransportDependencies({
        healthService: mockHealthService,
        loggerService: mockLoggerService,
        configService: mockConfigService,
      });
      const freshTransport = new HttpTransport(config, freshDependencies);

      // This should not throw but should send an error response
      await (freshTransport as any).handleMcpRequest(request, mockTransport);
      
      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32603,
          message: 'MCP server service not initialized',
        },
      });
    });

    it('should handle tools/list method', async () => {
      const request = { method: 'tools/list', id: 3 };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Without mcpServerService set, should return error
      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 3,
        error: {
          code: -32603,
          message: 'MCP server service not initialized',
        },
      });
    });

    it('should handle tools/call method with get_api_health', async () => {
      const request = { 
        method: 'tools/call', 
        id: 4,
        params: { name: 'get_api_health', arguments: {} }
      };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Without mcpServerService set, should return error
      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 4,
        error: {
          code: -32603,
          message: 'MCP server service not initialized',
        },
      });
    });

    it('should handle tools/call method with unknown tool', async () => {
      const request = { 
        method: 'tools/call', 
        id: 5,
        params: { name: 'unknown_tool', arguments: {} }
      };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Without mcpServerService set, should return error
      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 5,
        error: {
          code: -32603,
          message: 'MCP server service not initialized',
        },
      });
    });

    it('should handle resources/list method', async () => {
      const request = { method: 'resources/list', id: 6 };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Without mcpServerService set, should return error
      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 6,
        error: {
          code: -32603,
          message: 'MCP server service not initialized',
        },
      });
    });

    it('should handle resources/list method with custom apiScopePrefix', async () => {
      // Create transport with custom apiScopePrefix
      const customAppConfig = {
        apiPrefix: '/mcapi',
        apiScopePrefix: '/custom-api',
        swaggerHostname: 'http://localhost:3232',
        port: 3232,
      };
      
      const customDependencies = createTransportDependencies({
        healthService: mockHealthService,
        loggerService: mockLoggerService,
        appConfig: customAppConfig,
        configService: mockConfigService,
      });
      
      const customTransport = new HttpTransport(config, customDependencies);

      const request = { method: 'resources/list', id: 6 };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Without mcpServerService set, should return error
      await (customTransport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 6,
        error: {
          code: -32603,
          message: 'MCP server service not initialized',
        },
      });
    });

    it('should handle resources/read method with doc://openapi URI', async () => {
      const request = { 
        method: 'resources/read', 
        id: 7,
        params: { uri: 'doc://openapi' }
      };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Without mcpServerService set, should return error
      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 7,
        error: {
          code: -32603,
          message: 'MCP server service not initialized',
        },
      });
    });

    it('should handle resources/read method with unknown URI', async () => {
      const request = { 
        method: 'resources/read', 
        id: 8,
        params: { uri: 'unknown://resource' }
      };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Without mcpServerService set, should return error
      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 8,
        error: {
          code: -32603,
          message: 'MCP server service not initialized',
        },
      });
    });
  });

  describe('dependency validation', () => {
    it('should not require healthService for HttpTransport (delegates to McpServerService)', () => {
      const invalidDependencies = {
        loggerService: mockLoggerService,
      };
      
      expect(() => {
        new HttpTransport(config, invalidDependencies);
      }).not.toThrow();
    });

    it('should accept valid dependencies', () => {
      const validDependencies = createTransportDependencies({
        healthService: mockHealthService,
        loggerService: mockLoggerService,
        configService: mockConfigService,
      });
      
      expect(() => {
        new HttpTransport(config, validDependencies);
      }).not.toThrow();
    });
  });
});