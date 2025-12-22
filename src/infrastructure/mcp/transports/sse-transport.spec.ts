import { Server as HttpServer } from 'http';

import { HealthService } from '../../../modules/health/health.service';

import { TransportConfig } from './base-transport';
import { SseTransport } from './sse-transport';
import { createTransportDependencies } from './transport-dependencies';

// Mock the HTTP server
jest.mock('http', () => ({
  createServer: jest.fn(),
}));

describe('SseTransport', () => {
  let transport: SseTransport;
  let mockServer: jest.Mocked<HttpServer>;
  let mockMcpServer: any;
  let mockHealthService: jest.Mocked<HealthService>;
  let config: TransportConfig;

  beforeEach(() => {
    config = {
      transport: 'sse',
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

    transport = new SseTransport(config, dependencies);

    mockServer = {
      listen: jest.fn().mockImplementation((_port: unknown, _host: unknown, callback?: () => void) => {
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
      expect(transport.getTransportInfo().type).toBe('sse');
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
  });

  describe('disconnect', () => {
    it('should close all SSE connections and HTTP server', async () => {
      const mockClient = {
        end: jest.fn(),
      } as any;

      (transport as any).httpServer = mockServer;
      (transport as any).clients.add(mockClient);

      await transport.disconnect();

      expect(mockClient.end).toHaveBeenCalled();
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
        type: 'sse',
        details: {
          host: config.host,
          port: config.port,
          serverName: config.serverName,
          version: config.serverVersion,
          eventsEndpoint: `http://${config.host}:${config.port}/mcp/events`,
          requestEndpoint: `http://${config.host}:${config.port}/mcp`,
          infoEndpoint: `http://${config.host}:${config.port}/mcp/info`,
          activeConnections: 0,
        },
      });
    });

    it('should track active connections', () => {
      const mockClient = {} as any;
      (transport as any).clients.add(mockClient);

      const info = transport.getTransportInfo();
      expect(info.details.activeConnections).toBe(1);
    });
  });

  describe('request routing', () => {
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
        method: 'GET',
        url: '/mcp/events',
        on: jest.fn(),
      };

      mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
    });

    it('should handle OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';
      mockReq.url = '/mcp';
      
      requestHandler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(mockRes.writeHead).toHaveBeenCalledWith(200);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should route to SSE connection handler', () => {
      mockReq.method = 'GET';
      mockReq.url = '/mcp/events';
      
      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Type': 'text/event-stream',
      }));
    });

    it('should route to MCP request handler', () => {
      mockReq.method = 'POST';
      mockReq.url = '/mcp';
      
      requestHandler(mockReq, mockRes);

      expect(mockReq.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockReq.on).toHaveBeenCalledWith('end', expect.any(Function));
    });

    it('should route to info handler', () => {
      mockReq.method = 'GET';
      mockReq.url = '/mcp/info';
      
      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining('test-server'));
    });

    it('should return 404 for unknown paths', () => {
      mockReq.method = 'GET';
      mockReq.url = '/unknown';
      
      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Not found' }));
    });
  });

  describe('SSE connection handling', () => {
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
        method: 'GET',
        url: '/mcp/events',
        on: jest.fn(),
      };

      mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
    });

    it('should set SSE headers', () => {
      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
    });

    it('should send initial connection event', () => {
      requestHandler(mockReq, mockRes);

      expect(mockRes.write).toHaveBeenCalledWith('event: connected\n');
      expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining('data:'));
    });

    it('should add client to active connections', () => {
      const initialCount = (transport as any).clients.size;
      
      requestHandler(mockReq, mockRes);

      expect((transport as any).clients.size).toBe(initialCount + 1);
    });

    it('should remove client on connection close', () => {
      let closeHandler: () => void;
      mockReq.on.mockImplementation((event: string, handler: () => void) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });

      requestHandler(mockReq, mockRes);
      const countAfterConnect = (transport as any).clients.size;

      closeHandler!();

      expect((transport as any).clients.size).toBe(countAfterConnect - 1);
    });

    it('should remove client on connection error', () => {
      let errorHandler: () => void;
      mockReq.on.mockImplementation((event: string, handler: () => void) => {
        if (event === 'error') {
          errorHandler = handler;
        }
      });

      requestHandler(mockReq, mockRes);
      const countAfterConnect = (transport as any).clients.size;

      errorHandler!();

      expect((transport as any).clients.size).toBe(countAfterConnect - 1);
    });
  });

  describe('MCP request handling', () => {
    it('should handle initialize method', async () => {
      const request = { method: 'initialize', id: 1 };
      
      const response = await (transport as any).processMcpRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            // SSE transport provides only basic connectivity
            // Tools and resources are handled by HTTP transport
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
      
      const response = await (transport as any).processMcpRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 2,
        error: {
          code: -32601,
          message: "Method 'unknown' not supported in SSE transport. Use HTTP transport for tools and resources.",
          data: {
            supportedMethods: ['initialize'],
            recommendation: 'Use HTTP transport at the same host:port/mcp for full MCP functionality',
          },
        },
      });
    });
  });

  describe('POST request handling', () => {
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
        url: '/mcp',
        on: jest.fn(),
      };

      mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
    });

    it('should handle valid JSON POST requests', () => {
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

      expect(mockReq.on).toHaveBeenCalledWith('end', expect.any(Function));
    });
  });

  describe('broadcasting', () => {
    it('should broadcast events to all connected clients', () => {
      const mockClient1 = { write: jest.fn() } as any;
      const mockClient2 = { write: jest.fn() } as any;

      (transport as any).clients.add(mockClient1);
      (transport as any).clients.add(mockClient2);

      (transport as any).broadcastToClients('test-event', { data: 'test' });

      expect(mockClient1.write).toHaveBeenCalled();
      expect(mockClient2.write).toHaveBeenCalled();
    });

    it('should remove failed clients during broadcast', () => {
      const mockClient = {
        write: jest.fn().mockImplementation(() => {
          throw new Error('Write failed');
        }),
      } as any;

      (transport as any).clients.add(mockClient);
      const initialSize = (transport as any).clients.size;

      (transport as any).broadcastToClients('test-event', { data: 'test' });

      expect((transport as any).clients.size).toBe(initialSize - 1);
    });
  });

  describe('info endpoint', () => {
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
        method: 'GET',
        url: '/mcp/info',
        on: jest.fn(),
      };

      mockRes = {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
    });

    it('should return server info', () => {
      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
      
      const callArgs = mockRes.end.mock.calls[0][0];
      const info = JSON.parse(callArgs);

      expect(info).toHaveProperty('serverName', config.serverName);
      expect(info).toHaveProperty('version', config.serverVersion);
      expect(info).toHaveProperty('transport', 'sse');
      expect(info).toHaveProperty('endpoints');
      expect(info).toHaveProperty('activeConnections');
      expect(info).toHaveProperty('capabilities');
    });
  });

  describe('dependency validation', () => {
    it('should not require healthService for simplified SSE transport', () => {
      const emptyDependencies = {};
      
      expect(() => {
        new SseTransport(config, emptyDependencies);
      }).not.toThrow();
    });

    it('should accept valid dependencies when provided', () => {
      const validDependencies = createTransportDependencies({
        healthService: mockHealthService,
      });
      
      expect(() => {
        new SseTransport(config, validDependencies);
      }).not.toThrow();
    });
  });

  describe('MCP method processing', () => {
    it('should handle tools/list method with unsupported error', async () => {
      const request = { method: 'tools/list', id: 3 };
      const response = await (transport as any).processMcpRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 3,
        error: {
          code: -32601,
          message: "Method 'tools/list' not supported in SSE transport. Use HTTP transport for tools and resources.",
          data: {
            supportedMethods: ['initialize'],
            recommendation: 'Use HTTP transport at the same host:port/mcp for full MCP functionality',
          },
        },
      });
    });

    it('should handle tools/call method with unsupported error', async () => {
      const request = { 
        method: 'tools/call', 
        id: 4,
        params: { name: 'get_api_health', arguments: {} }
      };
      const response = await (transport as any).processMcpRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 4,
        error: {
          code: -32601,
          message: "Method 'tools/call' not supported in SSE transport. Use HTTP transport for tools and resources.",
          data: {
            supportedMethods: ['initialize'],
            recommendation: 'Use HTTP transport at the same host:port/mcp for full MCP functionality',
          },
        },
      });
    });

    it('should handle resources/list method with unsupported error', async () => {
      const request = { method: 'resources/list', id: 6 };
      const response = await (transport as any).processMcpRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 6,
        error: {
          code: -32601,
          message: "Method 'resources/list' not supported in SSE transport. Use HTTP transport for tools and resources.",
          data: {
            supportedMethods: ['initialize'],
            recommendation: 'Use HTTP transport at the same host:port/mcp for full MCP functionality',
          },
        },
      });
    });

    it('should handle resources/read method with unsupported error', async () => {
      const request = { 
        method: 'resources/read', 
        id: 7,
        params: { uri: 'swagger://docs/project/swagger/specs' }
      };
      const response = await (transport as any).processMcpRequest(request);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 7,
        error: {
          code: -32601,
          message: "Method 'resources/read' not supported in SSE transport. Use HTTP transport for tools and resources.",
          data: {
            supportedMethods: ['initialize'],
            recommendation: 'Use HTTP transport at the same host:port/mcp for full MCP functionality',
          },
        },
      });
    });
  });

  describe('fetchRealSwaggerResource', () => {
    it('should not exist in simplified SSE transport', () => {
      // SSE transport no longer has fetchRealSwaggerResource method
      expect((transport as any).fetchRealSwaggerResource).toBeUndefined();
    });
  });
});