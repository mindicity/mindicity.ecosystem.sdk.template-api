import mcpConfig from './mcp.config';

describe('McpConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default configuration when no environment variables are set', () => {
    delete process.env.MCP_ENABLED;
    delete process.env.MCP_TRANSPORT;
    delete process.env.MCP_PORT;
    delete process.env.MCP_HOST;
    delete process.env.MCP_SERVER_NAME;
    delete process.env.MCP_SERVER_VERSION;
    delete process.env.npm_package_version;
    delete process.env.npm_package_name;

    const config = mcpConfig();

    expect(config).toEqual({
      enabled: true,
      transport: 'http',
      port: 3235,
      host: 'localhost',
      serverName: 'mindicity-api-template',
      serverVersion: '1.0.0',
    });
  });

  it('should parse environment variables correctly', () => {
    process.env.MCP_ENABLED = 'false';
    process.env.MCP_TRANSPORT = 'http';
    process.env.MCP_PORT = '4000';
    process.env.MCP_HOST = '0.0.0.0';
    process.env.MCP_SERVER_NAME = 'custom-api';
    process.env.MCP_SERVER_VERSION = '2.0.0';

    const config = mcpConfig();

    expect(config).toEqual({
      enabled: false,
      transport: 'http',
      port: 4000,
      host: '0.0.0.0',
      serverName: 'custom-api',
      serverVersion: '2.0.0',
    });
  });

  it('should validate transport enum values', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    process.env.MCP_TRANSPORT = 'invalid';

    const config = mcpConfig();
    // Should fall back to default when invalid enum value is provided
    expect(config.transport).toBe('http');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid value for MCP_TRANSPORT: "invalid"')
    );
    
    consoleSpy.mockRestore();
  });

  it('should support all valid transport types', () => {
    const validTransports = ['stdio', 'http', 'sse'];
    
    validTransports.forEach(transport => {
      process.env.MCP_TRANSPORT = transport;
      const config = mcpConfig();
      expect(config.transport).toBe(transport);
    });
  });

  it('should validate port range', () => {
    process.env.MCP_PORT = '70000';

    expect(() => mcpConfig()).toThrow('Invalid MCP configuration');
  });

  it('should validate minimum port', () => {
    process.env.MCP_PORT = '0';

    expect(() => mcpConfig()).toThrow('Invalid MCP configuration');
  });

  it('should use default server name when empty string is provided', () => {
    process.env.MCP_SERVER_NAME = '';
    delete process.env.npm_package_name;

    const config = mcpConfig();
    expect(config.serverName).toBe('mindicity-api-template');
  });

  it('should use npm_package_name when MCP_SERVER_NAME is not set', () => {
    delete process.env.MCP_SERVER_NAME;
    process.env.npm_package_name = 'my-awesome-api';

    const config = mcpConfig();
    expect(config.serverName).toBe('my-awesome-api');
  });

  it('should prioritize MCP_SERVER_NAME over npm_package_name', () => {
    process.env.MCP_SERVER_NAME = 'custom-server-name';
    process.env.npm_package_name = 'my-awesome-api';

    const config = mcpConfig();
    expect(config.serverName).toBe('custom-server-name');
  });

  it('should use default server version when empty string is provided', () => {
    process.env.MCP_SERVER_VERSION = '';
    delete process.env.npm_package_version;

    const config = mcpConfig();
    expect(config.serverVersion).toBe('1.0.0');
  });

  it('should use npm_package_version when MCP_SERVER_VERSION is not set', () => {
    delete process.env.MCP_SERVER_VERSION;
    process.env.npm_package_version = '2.5.3';

    const config = mcpConfig();
    expect(config.serverVersion).toBe('2.5.3');
  });

  it('should prioritize MCP_SERVER_VERSION over npm_package_version', () => {
    process.env.MCP_SERVER_VERSION = '3.0.0';
    process.env.npm_package_version = '2.5.3';

    const config = mcpConfig();
    expect(config.serverVersion).toBe('3.0.0');
  });
});