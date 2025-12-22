import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { TransportConfig } from './base-transport';
import { StdioTransport } from './stdio-transport';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}));

describe('StdioTransport', () => {
  let transport: StdioTransport;
  let mockMcpServer: jest.Mocked<Server>;
  let mockStdioTransport: jest.Mocked<StdioServerTransport>;
  let config: TransportConfig;

  beforeEach(() => {
    config = {
      transport: 'stdio',
      serverName: 'test-server',
      serverVersion: '1.0.0',
    };

    mockMcpServer = {
      connect: jest.fn(),
    } as any;

    mockStdioTransport = {} as any;

    const StdioServerTransportMock = StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>;
    StdioServerTransportMock.mockImplementation(() => mockStdioTransport);

    transport = new StdioTransport(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create transport with config', () => {
      expect(transport).toBeDefined();
      expect(transport.getTransportInfo().type).toBe('stdio');
    });
  });

  describe('connect', () => {
    it('should create StdioServerTransport and connect server', async () => {
      mockMcpServer.connect.mockResolvedValue(undefined);

      await transport.connect(mockMcpServer);

      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockMcpServer.connect).toHaveBeenCalledWith(mockStdioTransport);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockMcpServer.connect.mockRejectedValue(error);

      await expect(transport.connect(mockMcpServer)).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnect', () => {
    it('should cleanup transport reference', async () => {
      // Set up transport first
      await transport.connect(mockMcpServer);
      expect((transport as any).transport).toBe(mockStdioTransport);

      await transport.disconnect();

      expect((transport as any).transport).toBeNull();
    });

    it('should handle disconnect when transport is null', async () => {
      await expect(transport.disconnect()).resolves.not.toThrow();
    });
  });

  describe('getTransportInfo', () => {
    it('should return correct transport info', () => {
      const info = transport.getTransportInfo();

      expect(info).toEqual({
        type: 'stdio',
        details: {
          serverName: config.serverName,
          version: config.serverVersion,
        },
      });
    });
  });
});