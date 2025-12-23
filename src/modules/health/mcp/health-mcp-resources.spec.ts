import { ConfigService } from '@nestjs/config';

import { HealthMcpResources } from './health-mcp-resources';

describe('HealthMcpResources', () => {
  let healthMcpResources: HealthMcpResources;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockAppConfig = {
    port: 3232,
    apiPrefix: '/mcapi',
    apiScopePrefix: '/test',
    swaggerHostname: 'http://localhost:3232',
  };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app') return mockAppConfig;
        return null;
      }),
    } as any;

    healthMcpResources = new HealthMcpResources(mockConfigService);
  });

  afterEach(() => {
    // Clear all mocks and restore original modules
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('getResourceDefinitions', () => {
    it('should return dynamic resource definitions based on OpenAPI file', () => {
      const definitions = HealthMcpResources.getResourceDefinitions(mockConfigService);

      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBe(1);

      const swaggerResource = definitions[0];
      expect(swaggerResource.uri).toBe('doc://openapi/test/specs');
      expect(swaggerResource.name).toBe('NestJS API OpenAPI Specification');
      expect(swaggerResource.description).toContain('Complete OpenAPI 3.0 specification for NestJS API');
      expect(swaggerResource.description).toContain('Production-ready NestJS API with Fastify and Pino');
      expect(swaggerResource.description).toContain('2 available API endpoints'); // health endpoints
      expect(swaggerResource.description).toContain('/mcapi/health/project/ping');
      expect(swaggerResource.description).toContain('/mcapi/health/project/status');
      expect(swaggerResource.mimeType).toBe('application/json');
    });

    it('should handle missing app config', () => {
      const configWithoutApp = {
        get: jest.fn(() => null),
      } as any;

      const definitions = HealthMcpResources.getResourceDefinitions(configWithoutApp);

      expect(definitions.length).toBe(1);
      expect(definitions[0].uri).toBe('doc://openapi/specs');
      // Should still generate dynamic content from OpenAPI file
      expect(definitions[0].name).toBe('NestJS API OpenAPI Specification');
    });

    it('should handle empty apiScopePrefix', () => {
      const configWithEmptyScope = {
        get: jest.fn(() => ({ ...mockAppConfig, apiScopePrefix: '' })),
      } as any;

      const definitions = HealthMcpResources.getResourceDefinitions(configWithEmptyScope);

      expect(definitions[0].uri).toBe('doc://openapi/specs');
      expect(definitions[0].name).toBe('NestJS API OpenAPI Specification');
    });

    it('should fallback to generic description when OpenAPI file cannot be read', () => {
      // Mock fs to simulate file not existing for this specific test
      const originalFs = require('fs');
      const mockFs = {
        existsSync: jest.fn(() => false),
        readFileSync: jest.fn(() => {
          throw new Error('File not found');
        }),
      };
      
      // Temporarily replace fs module
      jest.doMock('fs', () => mockFs);
      
      // Clear require cache to force re-import
      delete require.cache[require.resolve('fs')];

      const definitions = HealthMcpResources.getResourceDefinitions(mockConfigService);

      expect(definitions.length).toBe(1);
      expect(definitions[0].name).toBe('API OpenAPI Specification');
      expect(definitions[0].description).toContain('Complete OpenAPI 3.0 specification for the API');
      expect(definitions[0].description).not.toContain('NestJS API'); // Should not contain specific API name
      
      // Restore original fs
      jest.doMock('fs', () => originalFs);
    });
  });

  describe('handleResourceRead', () => {
    it('should handle swagger resource URIs', async () => {
      const uri = 'doc://openapi/test/specs';
      const result = await healthMcpResources.handleResourceRead(uri);

      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', uri);
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
      expect(result.contents[0]).toHaveProperty('text');

      const content = result.contents[0].text!;
      const parsedContent = JSON.parse(content);
      expect(parsedContent).toHaveProperty('openapi', '3.0.0');
      expect(parsedContent).toHaveProperty('info');
      expect(parsedContent.info).toHaveProperty('title', 'NestJS API');
    });

    it('should handle unknown resource URIs', async () => {
      const uri = 'unknown://resource';
      const result = await healthMcpResources.handleResourceRead(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', uri);
      expect(result.contents[0]).toHaveProperty('mimeType', 'text/plain');
      expect(result.contents[0].text).toContain('Error reading health resource: Unknown health resource URI');
    });

    it('should return error when OpenAPI file does not exist', async () => {
      // Mock fs to simulate file not existing for this specific test
      const mockFs = {
        existsSync: jest.fn(() => false),
      };
      
      jest.doMock('fs', () => mockFs);

      const uri = 'doc://openapi/test/specs';
      const result = await healthMcpResources.handleResourceRead(uri);

      expect(result.contents[0].mimeType).toBe('text/plain');
      expect(result.contents[0].text).toContain('OpenAPI specification file not found');
    });

    it('should handle missing app config in resource read', async () => {
      const configWithoutApp = {
        get: jest.fn(() => null),
      } as any;

      const healthResourcesWithoutConfig = new HealthMcpResources(configWithoutApp);
      const uri = 'doc://openapi/specs';
      const result = await healthResourcesWithoutConfig.handleResourceRead(uri);

      // When app config is missing, it should return an error because it can't find the file
      expect(result.contents[0].mimeType).toBe('text/plain');
      expect(result.contents[0].text).toContain('OpenAPI specification file not found');
    });
  });

  describe('fetchHealthSwaggerResource', () => {
    it('should handle file system errors gracefully', async () => {
      // Mock fs to throw an error for this specific test
      const mockFs = {
        existsSync: jest.fn(() => {
          throw new Error('File system error');
        }),
      };
      
      jest.doMock('fs', () => mockFs);

      const uri = 'doc://openapi/test/specs';
      const result = await healthMcpResources.handleResourceRead(uri);

      expect(result.contents[0].mimeType).toBe('text/plain');
      expect(result.contents[0].text).toContain('Error fetching Health Swagger documentation');
    });
  });
});