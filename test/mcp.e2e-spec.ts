import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { McpServerService } from '../src/infrastructure/mcp/mcp-server.service';

describe('MCP Integration (e2e)', () => {
  let app: TestingModule;
  let mcpServerService: McpServerService;
  let configService: ConfigService;

  beforeAll(async () => {
    // Set test environment variables
    process.env.MCP_ENABLED = 'true';
    process.env.MCP_PORT = '3234';
    process.env.MCP_SERVER_NAME = 'test-api';
    process.env.MCP_SERVER_VERSION = '1.0.0-test';

    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    mcpServerService = app.get<McpServerService>(McpServerService);
    configService = app.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    
    // Clean up environment variables
    delete process.env.MCP_ENABLED;
    delete process.env.MCP_PORT;
    delete process.env.MCP_SERVER_NAME;
    delete process.env.MCP_SERVER_VERSION;
  });

  it('should load MCP configuration correctly', () => {
    const mcpConfig = configService.get('mcp');
    
    expect(mcpConfig).toBeDefined();
    expect(mcpConfig.enabled).toBe(true);
    expect(mcpConfig.port).toBe(3234);
    expect(mcpConfig.serverName).toBe('test-api');
    expect(mcpConfig.serverVersion).toBe('1.0.0-test');
  });

  it('should initialize MCP server service', () => {
    expect(mcpServerService).toBeDefined();
    expect(mcpServerService).toBeInstanceOf(McpServerService);
  });

  it('should handle module lifecycle correctly', async () => {
    // Test that the service can be initialized and destroyed without errors
    await expect(mcpServerService.onModuleInit()).resolves.not.toThrow();
    await expect(mcpServerService.onModuleDestroy()).resolves.not.toThrow();
  });

  describe('MCP Tools', () => {
    it('should provide get_api_health tool functionality', async () => {
      const result = await (mcpServerService as any).handleDynamicToolCall('get_api_health', {});
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const healthStatus = JSON.parse(result.content[0].text);
      expect(healthStatus).toHaveProperty('status', 'healthy');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus).toHaveProperty('uptime');
      expect(healthStatus).toHaveProperty('memory');
    });

    it('should generate dynamic tools correctly', () => {
      const tools = (mcpServerService as any).generateDynamicTools();
      
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

    it('should handle unknown tool calls', () => {
      expect(() => {
        (mcpServerService as any).handleDynamicToolCall('unknown_tool', {});
      }).toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('Configuration Integration', () => {
    it('should integrate with app configuration', async () => {
      const appConfig = configService.get('app');
      const mcpConfig = configService.get('mcp');
      
      expect(appConfig).toBeDefined();
      expect(mcpConfig).toBeDefined();
      expect(mcpConfig.serverName).toBe('test-api');
      expect(mcpConfig.serverVersion).toBe('1.0.0-test');
      expect(mcpConfig.enabled).toBe(true);
    });

    it('should handle disabled MCP server', async () => {
      // Create a new module with MCP disabled
      process.env.MCP_ENABLED = 'false';
      
      const disabledApp = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const disabledMcpService = disabledApp.get<McpServerService>(McpServerService);
      
      // Should not throw when disabled
      await expect(disabledMcpService.onModuleInit()).resolves.not.toThrow();
      
      await disabledApp.close();
      
      // Reset for other tests
      process.env.MCP_ENABLED = 'true';
    });
  });
});