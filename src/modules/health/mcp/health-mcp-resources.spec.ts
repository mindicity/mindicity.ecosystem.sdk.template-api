import { ConfigService } from '@nestjs/config';

import { ContextLoggerService } from '../../../common/services/context-logger.service';

import { HealthMcpResources } from './health-mcp-resources';

describe('HealthMcpResources', () => {
  let healthMcpResources: HealthMcpResources;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockLoggerService: jest.Mocked<ContextLoggerService>;

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

    mockLoggerService = {
      child: jest.fn().mockReturnThis(),
      setContext: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
    } as any;

    healthMcpResources = new HealthMcpResources(mockConfigService, mockLoggerService);
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
      expect(swaggerResource.description).toContain('/mcapi/project/health/ping');
      expect(swaggerResource.description).toContain('/mcapi/project/health/status');
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
      // Since the actual file exists, we need to test the fallback by temporarily moving/renaming it
      // or by testing the fallback method directly
      const definitions = HealthMcpResources['generateFallbackResourceDefinitions']('test');

      expect(definitions.length).toBe(1);
      expect(definitions[0].name).toBe('API OpenAPI Specification');
      expect(definitions[0].description).toContain('Complete OpenAPI 3.0 specification for the API');
      expect(definitions[0].description).not.toContain('NestJS API'); // Should not contain specific API name
    });
  });

  describe('handleResourceRead', () => {
    it('should handle swagger resource URIs', () => {
      const uri = 'doc://openapi/test/specs';
      const result = healthMcpResources.handleResourceRead(uri);

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

    it('should handle unknown resource URIs', () => {
      const uri = 'unknown://resource';
      const result = healthMcpResources.handleResourceRead(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', uri);
      expect(result.contents[0]).toHaveProperty('mimeType', 'text/plain');
      expect(result.contents[0].text).toContain('Error reading health resource: Unknown health resource URI');
    });

    it('should return OpenAPI content when file exists', () => {
      const uri = 'doc://openapi/test/specs';
      const result = healthMcpResources.handleResourceRead(uri);

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

    it('should return OpenAPI content when app config is missing', () => {
      const configWithoutApp = {
        get: jest.fn(() => null),
      } as any;

      const healthResourcesWithoutConfig = new HealthMcpResources(configWithoutApp, mockLoggerService);
      const uri = 'doc://openapi/specs';
      const result = healthResourcesWithoutConfig.handleResourceRead(uri);

      // Even without app config, it should still be able to read the OpenAPI file
      expect(result.contents[0].mimeType).toBe('application/json');
      const content = result.contents[0].text!;
      const parsedContent = JSON.parse(content);
      expect(parsedContent).toHaveProperty('openapi', '3.0.0');
    });
  });

  describe('fetchHealthSwaggerResource', () => {
    it('should return OpenAPI content normally', () => {
      const uri = 'doc://openapi/test/specs';
      const result = healthMcpResources.handleResourceRead(uri);

      expect(result.contents[0].mimeType).toBe('application/json');
      const content = result.contents[0].text!;
      const parsedContent = JSON.parse(content);
      expect(parsedContent).toHaveProperty('openapi', '3.0.0');
    });
  });
});