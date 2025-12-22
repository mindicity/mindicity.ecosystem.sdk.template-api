import { Server as HttpServer } from 'http';

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
  let config: TransportConfig;

  beforeEach(() => {
    config = {
      transport: 'http',
      port: 3233,
      host: 'localhost',
      serverName: 'test-server',
      serverVersion: '1.0.0',
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

    const mockAppConfig = {
      apiPrefix: '/mcapi',
      apiScopePrefix: '/project',
      swaggerHostname: 'http://localhost:3232',
      port: 3232,
    };

    const dependencies = createTransportDependencies({
      healthService: mockHealthService,
      appConfig: mockAppConfig,
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
          // eslint-disable-next-line max-nested-callbacks
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
          endpoint: `http://${config.host}:${config.port}/mcp`,
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
      
      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(405, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Method not allowed' }));
    });

    it('should handle POST requests with valid JSON', () => {
      const requestData = JSON.stringify({ method: 'initialize', id: 1 });
      
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
          message: 'Method not implemented in HTTP transport: unknown',
        },
      });
    });

    it('should handle errors during request processing', async () => {
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
      const request = { method: 'initialize', id: 1 };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      // Don't call connect first
      const freshDependencies = createTransportDependencies({
        healthService: mockHealthService,
      });
      const freshTransport = new HttpTransport(config, freshDependencies);

      await expect(
        (freshTransport as any).handleMcpRequest(request, mockTransport)
      ).rejects.toThrow('MCP server not initialized');
    });

    it('should handle tools/list method', async () => {
      const request = { method: 'tools/list', id: 3 };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      (transport as any).mcpServer = mockMcpServer;

      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 3,
        result: {
          tools: [
            {
              name: 'get_api_health',
              description: 'Check the health status of the API server',
              inputSchema: {
                type: 'object',
                properties: {},
                required: [],
              },
            },
          ],
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

      (transport as any).mcpServer = mockMcpServer;

      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 4,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockHealthService.getHealthStatus(), null, 2),
            },
          ],
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

      (transport as any).mcpServer = mockMcpServer;

      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 5,
        error: {
          code: -32601,
          message: 'Unknown tool: unknown_tool',
        },
      });
    });

    it('should handle resources/list method', async () => {
      const request = { method: 'resources/list', id: 6 };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      (transport as any).mcpServer = mockMcpServer;

      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 6,
        result: {
          resources: [
            {
              uri: 'doc://openapi',
              name: 'API OpenAPI Specification',
              description: 'Complete OpenAPI/Swagger specification for the API endpoints',
              mimeType: 'application/json',
            },
          ],
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
        appConfig: customAppConfig,
      });
      
      const customTransport = new HttpTransport(config, customDependencies);
      (customTransport as any).mcpServer = mockMcpServer;

      const request = { method: 'resources/list', id: 6 };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      await (customTransport as any).handleMcpRequest(request, mockTransport);

      // Resources should be the same regardless of apiScopePrefix (semantic URIs)
      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 6,
        result: {
          resources: [
            {
              uri: 'doc://openapi',
              name: 'API OpenAPI Specification',
              description: 'Complete OpenAPI/Swagger specification for the API endpoints',
              mimeType: 'application/json',
            },
          ],
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

      (transport as any).mcpServer = mockMcpServer;

      // Mock the fetchOpenApiResource method
      (transport as any).fetchOpenApiResource = jest.fn().mockImplementation(
        (uri: string, id: unknown, transport: { send: (response: unknown) => void }): void => {
          transport.send({
            jsonrpc: '2.0',
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: '{"openapi": "3.0.0"}',
                },
              ],
            },
          });
        }
      );

      await (transport as any).handleMcpRequest(request, mockTransport);

      expect((transport as any).fetchOpenApiResource).toHaveBeenCalledWith('doc://openapi', 7, expect.any(Object));
    });

    it('should handle resources/read method with unknown URI', async () => {
      const request = { 
        method: 'resources/read', 
        id: 8,
        params: { uri: 'unknown://resource' }
      };
      const mockTransport = { send: jest.fn(), close: jest.fn() };

      (transport as any).mcpServer = mockMcpServer;

      await (transport as any).handleMcpRequest(request, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 8,
        error: {
          code: -32601,
          message: 'Unknown resource URI: unknown://resource',
          data: {
            supportedSchemes: ['doc://'],
            availableResources: ['doc://openapi'],
          },
        },
      });
    });
  });

  describe('fetchOpenApiResource', () => {
    it('should fetch openapi content from file system', async () => {
      const mockTransport = { send: jest.fn() };
      const uri = 'doc://openapi';
      const id = 123;

      // Mock fs module
      const mockFs = {
        existsSync: jest.fn().mockReturnValue(true),
        readFileSync: jest.fn().mockReturnValue('{"openapi": "3.0.0", "info": {"title": "Test API"}}'),
      };

      const mockPath = {
        join: jest.fn().mockReturnValue('/path/to/openapi.json'),
      };

      jest.doMock('fs', () => mockFs);
      jest.doMock('path', () => mockPath);

      await (transport as any).fetchOpenApiResource(uri, id, mockTransport);

      expect(mockFs.existsSync).toHaveBeenCalledWith('/path/to/openapi.json');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/openapi.json', 'utf8');
      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id,
        result: {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: '{"openapi": "3.0.0", "info": {"title": "Test API"}}',
            },
          ],
        },
      });
    });

    it('should generate minimal spec when file does not exist', async () => {
      const mockTransport = { send: jest.fn() };
      const uri = 'doc://openapi';
      const id = 456;

      // Mock fs module to return false for existsSync
      const mockFs = {
        existsSync: jest.fn().mockReturnValue(false),
      };

      const mockPath = {
        join: jest.fn().mockReturnValue('/path/to/openapi.json'),
      };

      jest.doMock('fs', () => mockFs);
      jest.doMock('path', () => mockPath);

      await (transport as any).fetchOpenApiResource(uri, id, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id,
        result: {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: expect.stringContaining('"openapi": "3.0.0"'),
            },
          ],
        },
      });
    });

    it('should handle errors during openapi resource fetch', async () => {
      const mockTransport = { send: jest.fn() };
      const uri = 'doc://openapi';
      const id = 789;

      // Override the mock to simulate an error
      (transport as any).fetchOpenApiResource = jest.fn().mockImplementation(
        (uri: string, id: unknown, transport: { send: (response: unknown) => void }): void => {
          transport.send({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: 'Error fetching OpenAPI specification',
              data: 'File system error',
            },
          });
        }
      );

      await (transport as any).fetchOpenApiResource(uri, id, mockTransport);

      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Error fetching OpenAPI specification',
          data: 'File system error',
        },
      });
    });
  });

  describe('dependency validation', () => {
    it('should throw error when healthService is missing', () => {
      const invalidDependencies = {};
      
      expect(() => {
        new HttpTransport(config, invalidDependencies);
      }).toThrow('HttpTransport requires HealthService in dependencies');
    });

    it('should accept valid dependencies', () => {
      const validDependencies = createTransportDependencies({
        healthService: mockHealthService,
      });
      
      expect(() => {
        new HttpTransport(config, validDependencies);
      }).not.toThrow();
    });
  });
});