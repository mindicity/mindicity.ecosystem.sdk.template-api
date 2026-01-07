import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { ConfigService } from '@nestjs/config';

import { ContextLoggerService } from '../../../common/services/context-logger.service';

/**
 * MCP resources for health module.
 * Provides access to API documentation and specifications.
 */
export class HealthMcpResources {
  private readonly logger: ContextLoggerService;

  constructor(
    private readonly configService: ConfigService,
    loggerService: ContextLoggerService,
  ) {
    this.logger = loggerService.child({ serviceContext: 'HealthMcpResources' });
  }

  /**
   * Get resource definitions for health module.
   * Dynamically generates resource definitions based on the actual OpenAPI specification file.
   * 
   * @param configService - Configuration service to get app settings
   * @returns Array of detailed resource definitions generated from OpenAPI spec
   */
  static getResourceDefinitions(configService: ConfigService): Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }> {
    const appConfig = configService.get('app');
    const apiScopePrefix = appConfig?.apiScopePrefix ?? '';
    
    // Try to read the OpenAPI file to generate dynamic descriptions
    try {
      return HealthMcpResources.generateDynamicResourceDefinitions(apiScopePrefix);
    } catch {
      // Fallback to generic description if file doesn't exist or can't be read
      return HealthMcpResources.generateFallbackResourceDefinitions(apiScopePrefix);
    }
  }

  /**
   * Generate dynamic resource definitions from OpenAPI file.
   * @private
   */
  private static generateDynamicResourceDefinitions(apiScopePrefix: string): Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }> {
    const openApiPath = join(process.cwd(), 'docs', 'api', 'openapi.json');
    
    if (!existsSync(openApiPath)) {
      throw new Error('OpenAPI file not found');
    }

    const swaggerContent = readFileSync(openApiPath, 'utf8');
    const openApiSpec = JSON.parse(swaggerContent);
    
    // Extract basic information from the OpenAPI spec
    const apiInfo = HealthMcpResources.extractApiInfo(openApiSpec);
    const pathsInfo = HealthMcpResources.extractPathsInfo(openApiSpec);
    
    return [
      {
        uri: `doc://openapi${apiScopePrefix}/specs`,
        name: `${apiInfo.title} OpenAPI Specification`,
        description: HealthMcpResources.buildDynamicDescription(apiInfo, pathsInfo),
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * Extract API information from OpenAPI spec.
   * @private
   */
  private static extractApiInfo(openApiSpec: Record<string, unknown>): {
    title: string;
    version: string;
    description: string;
    schemaCount: number;
    tagNames: string;
  } {
    const info = openApiSpec.info as Record<string, unknown> | undefined;
    const apiTitle = info?.title as string ?? 'API';
    const apiDescription = info?.description as string ?? 'API documentation';
    const apiVersion = info?.version as string ?? '1.0.0';
    
    // Get available schemas
    const components = openApiSpec.components as Record<string, unknown> | undefined;
    const schemas = components?.schemas as Record<string, unknown> | undefined;
    const schemaCount = schemas ? Object.keys(schemas).length : 0;
    
    // Get available tags
    const tags = openApiSpec.tags as Array<{ name: string }> | undefined;
    const tagNames = tags ? tags.map((tag) => tag.name).join(', ') : '';
    
    return {
      title: apiTitle,
      version: apiVersion,
      description: apiDescription,
      schemaCount,
      tagNames,
    };
  }

  /**
   * Extract paths information from OpenAPI spec.
   * @private
   */
  private static extractPathsInfo(openApiSpec: Record<string, unknown>): {
    paths: string[];
    endpointCount: number;
  } {
    const pathsObj = openApiSpec.paths as Record<string, unknown> | undefined;
    const paths = pathsObj ? Object.keys(pathsObj) : [];
    const endpointCount = paths.length;
    
    return {
      paths,
      endpointCount,
    };
  }

  /**
   * Build dynamic description from OpenAPI metadata.
   * @private
   */
  private static buildDynamicDescription(
    apiInfo: { title: string; version: string; description: string; schemaCount: number; tagNames: string },
    pathsInfo: { paths: string[]; endpointCount: number }
  ): string {
    const endpointsList = pathsInfo.paths.slice(0, 10).map(path => `- ${path}`).join('\n');
    const moreEndpoints = pathsInfo.paths.length > 10 ? `\n- ... and ${pathsInfo.paths.length - 10} more endpoints` : '';
    const tagsSection = apiInfo.tagNames ? `- API sections: ${apiInfo.tagNames}` : '';

    return `Complete OpenAPI 3.0 specification for ${apiInfo.title} (v${apiInfo.version}).

${apiInfo.description}

This resource contains the full API documentation including:
- ${pathsInfo.endpointCount} available API endpoints with HTTP methods and paths
- ${apiInfo.schemaCount} data models and schema definitions
- Request/response schemas and validation rules
- Authentication requirements and security schemes
- Error response formats and status codes
- Example requests and responses for all endpoints
${tagsSection}

Available endpoints:
${endpointsList}${moreEndpoints}

Use this resource to:
- Understand the complete API structure and capabilities
- Generate proper API requests with correct parameters and schemas
- Validate request/response formats against official schemas
- Learn about available endpoints and their specific purposes
- Get comprehensive schema definitions for all data models
- Access authentication and security requirements

Format: JSON document following OpenAPI 3.0 specification standard.
Content: Machine-readable API specification that can be used to generate client code, documentation, or API calls.`;
  }

  /**
   * Generate fallback resource definitions when OpenAPI file is not available.
   * @private
   */
  private static generateFallbackResourceDefinitions(apiScopePrefix: string): Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }> {
    return [
      {
        uri: `doc://openapi${apiScopePrefix}/specs`,
        name: 'API OpenAPI Specification',
        description: `Complete OpenAPI 3.0 specification for the API.

This resource contains the full API documentation including:
- All available API endpoints with HTTP methods and paths
- Request/response schemas and data models
- Parameter definitions and validation rules
- Authentication requirements
- Error response formats
- Example requests and responses

Use this resource to:
- Understand the complete API structure and capabilities
- Generate proper API requests with correct parameters
- Validate request/response formats
- Learn about available endpoints and their purposes
- Get schema definitions for data models

Format: JSON document following OpenAPI 3.0 specification standard.
Content: Machine-readable API specification that can be used to generate client code, documentation, or API calls.`,
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * Handle resource read requests for health module.
   * @param uri - Resource URI to read
   * @returns Resource content
   */
  handleResourceRead(uri: string): {
    contents: Array<{ uri: string; mimeType: string; text?: string }>;
  } {
    this.logger.trace('handleResourceRead() called', { uri });
    
    try {
      if (uri.startsWith('doc://openapi') && uri.includes('/specs')) {
        return this.fetchHealthSwaggerResource(uri);
      }

      throw new Error(`Unknown health resource URI: ${uri}`);
    } catch (error) {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Error reading health resource: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  /**
   * Fetch the Health API Swagger resource content.
   * @private
   */
  private fetchHealthSwaggerResource(uri: string): {
    contents: Array<{ uri: string; mimeType: string; text?: string }>;
  } {
    this.logger.trace('fetchHealthSwaggerResource() called', { uri });
    
    try {
      const openApiPath = join(process.cwd(), 'docs', 'api', 'openapi.json');
      
      if (existsSync(openApiPath)) {
        const swaggerContent = readFileSync(openApiPath, 'utf8');
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: swaggerContent,
            },
          ],
        };
      }
      
      // No fallback - return error if file doesn't exist
      throw new Error('OpenAPI specification file not found. Please generate the API documentation first.');
    } catch (error) {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Error fetching Health Swagger documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}